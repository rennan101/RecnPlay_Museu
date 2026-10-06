/**
 * Módulo de Visão Computacional para Reconhecimento de Formas/Objetos
 * Baseado em Extração de Features Visuais e Comparação Vetorial / Contornos
 */

class ShapeRecognizer {
  constructor() {
    this.isReady = false;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.signatures = {};
    this.history = [];
    this.historyMaxLength = 6;
  }

  async init() {
    // Inicializa as assinaturas de referência com base nas características morfológicas/visuais de cada peça
    this.setupReferenceSignatures();
    this.isReady = true;
    return true;
  }

  setupReferenceSignatures() {
    /**
     * Assinaturas de Perfil Morfológico e Distribuição de Densidade / Contorno:
     * - Flautista: Estrutura alongada vertical com calota arredondada no topo e estreitamento maxilar/mandíbula.
     * - Hippidion (Astrágalo): Forma cúbica/articular compacta, aspecto ósseo denso com concavidades e ranhuras articulares.
     * - Peixe-boi: Forma óssea ampla/alongada com arco zigomático proeminente e rostro característico.
     */
    this.signatures = {
      flautista: {
        aspectRatio: 1.35, // Altura > Largura (formato craniano frontal)
        edgeDensity: 0.28,
        topHeavy: 0.65, // Mais massa visual na parte superior (calota)
        centerSymmetry: 0.82
      },
      hippidion: {
        aspectRatio: 1.05, // Compacto e volumétrico
        edgeDensity: 0.35,
        topHeavy: 0.50, // Distribuição homogênea
        centerSymmetry: 0.60
      },
      peixeboi: {
        aspectRatio: 0.75, // Mais largo / horizontal que alto
        edgeDensity: 0.31,
        topHeavy: 0.42,
        centerSymmetry: 0.75
      }
    };
  }

  /**
   * Analisa a região central do vídeo capturado pela câmera
   */
  processFrame(videoElement, roiRect) {
    if (!this.isReady || !videoElement || videoElement.videoWidth === 0) return null;

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;

    // Dimensão normalizada para análise rápida de contornos (128x128)
    const sampleSize = 128;
    this.canvas.width = sampleSize;
    this.canvas.height = sampleSize;

    // Coordenadas da Região de Interesse (ROI) no centro do visor
    const sx = (vw - Math.min(vw, vh) * 0.7) / 2;
    const sy = (vh - Math.min(vw, vh) * 0.7) / 2;
    const sDim = Math.min(vw, vh) * 0.7;

    this.ctx.drawImage(videoElement, sx, sy, sDim, sDim, 0, 0, sampleSize, sampleSize);
    const imgData = this.ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    // Análise de Gradiente / Bordas (Sobel Simplificado)
    let totalEdges = 0;
    let topHalfEdges = 0;
    let bottomHalfEdges = 0;
    let leftEdges = 0;
    let rightEdges = 0;

    const gray = new Float32Array(sampleSize * sampleSize);
    for (let i = 0; i < data.length; i += 4) {
      // Luminância
      gray[i / 4] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
    }

    let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;

    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = y * sampleSize + x;
        // Gradiente Horizontal & Vertical
        const gx = -gray[idx - sampleSize - 1] + gray[idx - sampleSize + 1]
                   -2 * gray[idx - 1] + 2 * gray[idx + 1]
                   -gray[idx + sampleSize - 1] + gray[idx + sampleSize + 1];

        const gy = -gray[idx - sampleSize - 1] - 2 * gray[idx - sampleSize] - gray[idx - sampleSize + 1]
                   +gray[idx + sampleSize - 1] + 2 * gray[idx + sampleSize] + gray[idx + sampleSize + 1];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 0.35) {
          totalEdges++;
          if (y < sampleSize / 2) topHalfEdges++;
          else bottomHalfEdges++;

          if (x < sampleSize / 2) leftEdges++;
          else rightEdges++;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Se houver poucas bordas, é apenas fundo vazio
    if (totalEdges < 150) {
      this.pushHistory(null);
      return null;
    }

    const objWidth = Math.max(1, maxX - minX);
    const objHeight = Math.max(1, maxY - minY);
    const currentAspectRatio = objHeight / objWidth;
    const currentEdgeDensity = totalEdges / (sampleSize * sampleSize);
    const currentTopHeavy = (topHalfEdges + 1) / (totalEdges + 2);
    const symmetry = 1.0 - Math.abs(leftEdges - rightEdges) / (totalEdges + 1);

    // Comparação de Distância Euclidiana com os alvos cadastrados
    let bestMatch = null;
    let lowestDistance = 999;

    for (const [id, sig] of Object.entries(this.signatures)) {
      const dAspect = Math.abs(currentAspectRatio - sig.aspectRatio) * 1.5;
      const dDensity = Math.abs(currentEdgeDensity - sig.edgeDensity) * 1.0;
      const dTop = Math.abs(currentTopHeavy - sig.topHeavy) * 1.8;
      const dSym = Math.abs(symmetry - sig.centerSymmetry) * 0.8;

      const totalDist = Math.sqrt(dAspect * dAspect + dDensity * dDensity + dTop * dTop + dSym * dSym);

      if (totalDist < lowestDistance) {
        lowestDistance = totalDist;
        bestMatch = id;
      }
    }

    // Extrai o contorno periférico por varredura angular radial (Radial Raycasting)
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const numRays = 24;
    const contourPoints = [];

    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      let maxDist = Math.max(objWidth, objHeight) * 0.55;
      let foundX = centerX + cosA * maxDist;
      let foundY = centerY + sinA * maxDist;

      // Busca a borda de fora para dentro
      for (let r = maxDist; r >= 0; r -= 1.5) {
        const testX = Math.round(centerX + cosA * r);
        const testY = Math.round(centerY + sinA * r);
        if (testX >= 1 && testX < sampleSize - 1 && testY >= 1 && testY < sampleSize - 1) {
          const idx = testY * sampleSize + testX;
          const gx = -gray[idx - sampleSize - 1] + gray[idx - sampleSize + 1]
                     -2 * gray[idx - 1] + 2 * gray[idx + 1]
                     -gray[idx + sampleSize - 1] + gray[idx + sampleSize + 1];
          const gy = -gray[idx - sampleSize - 1] - 2 * gray[idx - sampleSize] - gray[idx - sampleSize + 1]
                     +gray[idx + sampleSize - 1] + 2 * gray[idx + sampleSize] + gray[idx + sampleSize + 1];
          if (Math.sqrt(gx * gx + gy * gy) > 0.3) {
            foundX = testX;
            foundY = testY;
            break;
          }
        }
      }

      contourPoints.push({
        x: foundX / sampleSize,
        y: foundY / sampleSize
      });
    }

    const confidence = Math.max(0, 1 - (lowestDistance / 1.6));

    const result = (confidence > 0.55) ? {
      id: bestMatch,
      confidence: confidence,
      bbox: {
        x: (minX / sampleSize),
        y: (minY / sampleSize),
        width: (objWidth / sampleSize),
        height: (objHeight / sampleSize)
      },
      contour: contourPoints
    } : null;

    return this.pushHistory(result);
  }

  pushHistory(result) {
    this.history.push(result ? result : null);
    if (this.history.length > this.historyMaxLength) {
      this.history.shift();
    }

    // Filtro temporal para evitar flickering
    const counts = {};
    let maxId = null;
    let maxCount = 0;
    let latestValidResult = null;

    for (const item of this.history) {
      if (!item) continue;
      counts[item.id] = (counts[item.id] || 0) + 1;
      if (counts[item.id] > maxCount) {
        maxCount = counts[item.id];
        maxId = item.id;
        latestValidResult = item;
      }
    }

    if (maxCount >= 2 && latestValidResult) {
      return { 
        id: maxId, 
        confidence: 0.85,
        bbox: latestValidResult.bbox,
        contour: latestValidResult.contour
      };
    }

    return null;
  }
}

window.ShapeRecognizer = ShapeRecognizer;
