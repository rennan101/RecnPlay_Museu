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
     * - Flautista: Estrutura vertical alongada (1.2 - 1.5), massa predominante no topo (calota), alta simetria.
     * - Hippidion (Astrágalo): Forma cúbica/articular compacta (0.95 - 1.15), textura óssea densa e distribuição homogênea.
     * - Peixe-boi: Forma óssea alongada horizontalmente (0.6 - 0.85), base mandibular pesada.
     */
    this.signatures = {
      flautista: {
        id: "flautista",
        name: "Flautista",
        aspectRatio: 1.35,
        edgeDensity: 0.28,
        topHeavy: 0.65,
        centerSymmetry: 0.82
      },
      hippidion: {
        id: "hippidion",
        name: "Hippidion",
        aspectRatio: 1.05,
        edgeDensity: 0.35,
        topHeavy: 0.50,
        centerSymmetry: 0.60
      },
      peixeboi: {
        id: "peixeboi",
        name: "Peixe-boi",
        aspectRatio: 0.75,
        edgeDensity: 0.31,
        topHeavy: 0.42,
        centerSymmetry: 0.75
      }
    };
    this.lastTelemetry = null;
  }

  /**
   * Retorna os dados de diagnóstico do último quadro analisado
   */
  getTelemetry() {
    return this.lastTelemetry;
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

    // Análise de Gradiente / Bordas (Sobel com limiar adaptativo)
    let totalEdges = 0;
    let topHalfEdges = 0;
    let bottomHalfEdges = 0;
    let leftEdges = 0;
    let rightEdges = 0;

    const gray = new Float32Array(sampleSize * sampleSize);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
    }

    let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;

    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = y * sampleSize + x;
        const gx = -gray[idx - sampleSize - 1] + gray[idx - sampleSize + 1]
                   -2 * gray[idx - 1] + 2 * gray[idx + 1]
                   -gray[idx + sampleSize - 1] + gray[idx + sampleSize + 1];

        const gy = -gray[idx - sampleSize - 1] - 2 * gray[idx - sampleSize] - gray[idx - sampleSize + 1]
                   +gray[idx + sampleSize - 1] + 2 * gray[idx + sampleSize] + gray[idx + sampleSize + 1];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 0.32) {
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

    // 1. FILTRO DE SUPERFÍCIE/COMPLEXIDADE ÓSSEA (Elimina mesas lisas, mãos e fundos homogêneos)
    // Objetos 3D ósseos impressos possuem rica textura/relevo (mínimo 280 bordas fortes e dimensões mínimas)
    if (totalEdges < 280 || (maxX - minX) < 28 || (maxY - minY) < 28) {
      this.lastTelemetry = {
        status: "searching",
        message: "Aponte para uma das 3 peças",
        totalEdges,
        metrics: null,
        scores: {}
      };
      this.pushHistory(null);
      return null;
    }

    const objWidth = Math.max(1, maxX - minX);
    const objHeight = Math.max(1, maxY - minY);
    const currentAspectRatio = objHeight / objWidth;
    const currentEdgeDensity = totalEdges / (sampleSize * sampleSize);
    const currentTopHeavy = (topHalfEdges + 1) / (totalEdges + 2);
    const symmetry = 1.0 - Math.abs(leftEdges - rightEdges) / (totalEdges + 1);

    // 2. COMPARAÇÃO RIGOROSA COM AS ASSINATURAS MORFOLÓGICAS
    let bestMatch = null;
    let lowestDistance = 999;
    let secondLowestDistance = 999;
    const scores = {};

    for (const [id, sig] of Object.entries(this.signatures)) {
      const dAspect = Math.abs(currentAspectRatio - sig.aspectRatio) * 2.2;
      const dDensity = Math.abs(currentEdgeDensity - sig.edgeDensity) * 1.5;
      const dTop = Math.abs(currentTopHeavy - sig.topHeavy) * 2.4;
      const dSym = Math.abs(symmetry - sig.centerSymmetry) * 1.2;

      const totalDist = Math.sqrt(dAspect * dAspect + dDensity * dDensity + dTop * dTop + dSym * dSym);
      const confidencePercent = Math.max(0, Math.min(100, Math.round((1 - (totalDist / 1.35)) * 100)));
      
      scores[id] = {
        name: sig.name,
        confidence: confidencePercent,
        distance: totalDist.toFixed(2)
      };

      if (totalDist < lowestDistance) {
        secondLowestDistance = lowestDistance;
        lowestDistance = totalDist;
        bestMatch = id;
      } else if (totalDist < secondLowestDistance) {
        secondLowestDistance = totalDist;
      }
    }

    // 3. CRITÉRIO ESTREITO ANTI-AMBIGUIDADE:
    // Exige:
    // a) Distância máxima baixa (< 0.70) correspondente a confiança >= 78%
    // b) Separação clara contra o 2º melhor match (evita falsos positivos entre peças ou com objetos genéricos)
    const bestConfidence = scores[bestMatch] ? scores[bestMatch].confidence : 0;
    const isSeparated = (secondLowestDistance - lowestDistance) > 0.18;
    const isStrictMatch = (lowestDistance < 0.68 && bestConfidence >= 78 && isSeparated);

    // Salva telemetria detalhada para o painel de diagnóstico
    this.lastTelemetry = {
      status: isStrictMatch ? "detected" : "analyzing",
      message: isStrictMatch ? `Identificado: ${this.signatures[bestMatch].name}` : "Enquadre o objeto no centro",
      totalEdges,
      metrics: {
        aspectRatio: currentAspectRatio.toFixed(2),
        edgeDensity: currentEdgeDensity.toFixed(2),
        topHeavy: currentTopHeavy.toFixed(2),
        symmetry: symmetry.toFixed(2),
        size: `${objWidth}x${objHeight}`
      },
      bestMatch: isStrictMatch ? bestMatch : null,
      scores
    };

    if (!isStrictMatch) {
      return this.pushHistory(null);
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

    const result = {
      id: bestMatch,
      confidence: bestConfidence / 100,
      bbox: {
        x: (minX / sampleSize),
        y: (minY / sampleSize),
        width: (objWidth / sampleSize),
        height: (objHeight / sampleSize)
      },
      contour: contourPoints
    };

    return this.pushHistory(result);
  }

  pushHistory(result) {
    this.history.push(result ? result : null);
    if (this.history.length > this.historyMaxLength) {
      this.history.shift();
    }

    // Filtro temporal: Exige ao menos 4 confirmações consecutivas/consistentes do mesmo objeto
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

    if (maxCount >= 4 && latestValidResult) {
      return { 
        id: maxId, 
        confidence: latestValidResult.confidence,
        bbox: latestValidResult.bbox,
        contour: latestValidResult.contour
      };
    }

    return null;
  }
}

window.ShapeRecognizer = ShapeRecognizer;
