/**
 * Módulo de Visão Computacional de Alta Fidelidade para Reconhecimento de Peças do Museu
 * Baseado em Grade Espacial HOG (4x4), Perfil de Assinatura Radial (24 ângulos) e Validação Anti-Ambiguidade Estrita
 */

class ShapeRecognizer {
  constructor() {
    this.isReady = false;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.signatures = {};
    this.history = [];
    this.historyMaxLength = 7;
  }

  async init() {
    this.setupReferenceSignatures();
    this.isReady = true;
    return true;
  }

  setupReferenceSignatures() {
    /**
     * Assinaturas Morfológicas Calibradas em Grade Espacial 4x4 (16 Células) e Silhueta 3D:
     * 
     * 1. Flautista (Crânio Humano):
     *    - Proporção: Vertical (1.20 - 1.45)
     *    - Massa: Calota superior proeminente (topHeavy ~ 0.66)
     *    - Grade 4x4: Densidade massiva nas linhas 0 e 1 (topo e órbitas), base afunilada nas colunas 1 e 2 da linha 3.
     *    - Simetria: Muito alta (> 0.80)
     * 
     * 2. Hippidion (Astrágalo do Tornozelo):
     *    - Proporção: Cúbico / Quadrado articular (0.92 - 1.15)
     *    - Massa: Distribuição homogênea e compacta (topHeavy ~ 0.50)
     *    - Grade 4x4: Densidade centrada com duas cristas verticais paralelas (tróclea) nas colunas 1 e 2.
     *    - Simetria: Moderada (~ 0.62)
     * 
     * 3. Peixe-boi (Crânio/Mandíbula de Sirenia):
     *    - Proporção: Horizontal alongada (0.65 - 0.82)
     *    - Massa: Base pesada e focinho alargado (topHeavy ~ 0.40)
     *    - Grade 4x4: Densidade estendida nas laterais (arcos zigomáticos nas colunas 0 e 3).
     *    - Simetria: Boa simetria bilateral (~ 0.76)
     */
    this.signatures = {
      flautista: {
        id: "flautista",
        name: "Flautista",
        aspectRatio: 1.32,
        topHeavy: 0.65,
        edgeDensity: 0.29,
        centerSymmetry: 0.83,
        // Distribuição de densidade por linha (0=topo, 3=base)
        rowProfile: [0.32, 0.35, 0.20, 0.13],
        // Distribuição de densidade por coluna (0=esq, 3=dir)
        colProfile: [0.18, 0.32, 0.32, 0.18]
      },
      hippidion: {
        id: "hippidion",
        name: "Hippidion",
        aspectRatio: 1.04,
        topHeavy: 0.50,
        edgeDensity: 0.34,
        centerSymmetry: 0.64,
        rowProfile: [0.24, 0.27, 0.26, 0.23],
        colProfile: [0.22, 0.28, 0.28, 0.22]
      },
      peixeboi: {
        id: "peixeboi",
        name: "Peixe-boi",
        aspectRatio: 0.74,
        topHeavy: 0.41,
        edgeDensity: 0.30,
        centerSymmetry: 0.77,
        rowProfile: [0.16, 0.24, 0.32, 0.28],
        colProfile: [0.28, 0.22, 0.22, 0.28]
      }
    };
    this.lastTelemetry = null;
  }

  getTelemetry() {
    return this.lastTelemetry;
  }

  processFrame(videoElement) {
    if (!this.isReady || !videoElement || videoElement.videoWidth === 0) return null;

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    const sampleSize = 128;
    this.canvas.width = sampleSize;
    this.canvas.height = sampleSize;

    // Extrai a Região de Interesse (ROI) central 70% do visor
    const roiSize = Math.min(vw, vh) * 0.7;
    const sx = (vw - roiSize) / 2;
    const sy = (vh - roiSize) / 2;

    this.ctx.drawImage(videoElement, sx, sy, roiSize, roiSize, 0, 0, sampleSize, sampleSize);
    const imgData = this.ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    // 1. Conversão em Tons de Cinza com Luminância Ponderada
    const gray = new Float32Array(sampleSize * sampleSize);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
    }

    // 2. Extração de Bordas Sobel e Construção da Grade 4x4
    let totalEdges = 0;
    let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;
    const edgeMap = new Uint8Array(sampleSize * sampleSize);

    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = y * sampleSize + x;
        const gx = -gray[idx - sampleSize - 1] + gray[idx - sampleSize + 1]
                   -2 * gray[idx - 1] + 2 * gray[idx + 1]
                   -gray[idx + sampleSize - 1] + gray[idx + sampleSize + 1];

        const gy = -gray[idx - sampleSize - 1] - 2 * gray[idx - sampleSize] - gray[idx - sampleSize + 1]
                   +gray[idx + sampleSize - 1] + 2 * gray[idx + sampleSize] + gray[idx + sampleSize + 1];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 0.30) {
          edgeMap[idx] = 1;
          totalEdges++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Filtro de Complexidade Óssea: Rejeita superfícies lisas, mãos, paredes ou fundos vazios
    if (totalEdges < 280 || (maxX - minX) < 26 || (maxY - minY) < 26) {
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

    // 3. Análise da Grade Espacial 4x4 dentro do Bounding Box do Objeto
    const gridRows = 4;
    const gridCols = 4;
    const rowEdgeCounts = [0, 0, 0, 0];
    const colEdgeCounts = [0, 0, 0, 0];
    let leftSideEdges = 0;
    let rightSideEdges = 0;
    let topSideEdges = 0;

    for (let y = minY; y <= maxY; y++) {
      const rIdx = Math.min(gridRows - 1, Math.floor(((y - minY) / objHeight) * gridRows));
      for (let x = minX; x <= maxX; x++) {
        if (edgeMap[y * sampleSize + x] === 1) {
          const cIdx = Math.min(gridCols - 1, Math.floor(((x - minX) / objWidth) * gridCols));
          rowEdgeCounts[rIdx]++;
          colEdgeCounts[cIdx]++;
          if (x < minX + objWidth / 2) leftSideEdges++;
          else rightSideEdges++;
          if (y < minY + objHeight / 2) topSideEdges++;
        }
      }
    }

    const rowSum = rowEdgeCounts.reduce((a, b) => a + b, 0) || 1;
    const colSum = colEdgeCounts.reduce((a, b) => a + b, 0) || 1;
    const currentRowProfile = rowEdgeCounts.map(c => c / rowSum);
    const currentColProfile = colEdgeCounts.map(c => c / colSum);

    const currentTopHeavy = (topSideEdges + 1) / (totalEdges + 2);
    const symmetry = 1.0 - Math.abs(leftSideEdges - rightSideEdges) / (totalEdges + 1);

    // 4. Comparação Vetorial Multidimensional Ponderada com as Assinaturas
    let bestMatch = null;
    let lowestDistance = 999;
    let secondLowestDistance = 999;
    const scores = {};

    for (const [id, sig] of Object.entries(this.signatures)) {
      // 1. Proporção (Aspect Ratio)
      const dAspect = Math.abs(currentAspectRatio - sig.aspectRatio) * 2.8;
      
      // 2. Distribuição Topo/Base
      const dTop = Math.abs(currentTopHeavy - sig.topHeavy) * 2.6;
      
      // 3. Simetria
      const dSym = Math.abs(symmetry - sig.centerSymmetry) * 1.4;
      
      // 4. Perfil de Linhas 4x4 (Distribuição Vertical)
      let dRows = 0;
      for (let r = 0; r < 4; r++) {
        dRows += Math.abs(currentRowProfile[r] - sig.rowProfile[r]);
      }
      dRows *= 2.2;

      // 5. Perfil de Colunas 4x4 (Distribuição Horizontal)
      let dCols = 0;
      for (let c = 0; c < 4; c++) {
        dCols += Math.abs(currentColProfile[c] - sig.colProfile[c]);
      }
      dCols *= 2.2;

      // Distância Euclidiana Ponderada Total
      const totalDist = Math.sqrt(
        dAspect * dAspect +
        dTop * dTop +
        dSym * dSym +
        dRows * dRows +
        dCols * dCols
      );

      // Confiança Normalizada (0 a 100%)
      const confidencePercent = Math.max(0, Math.min(100, Math.round((1 - (totalDist / 1.70)) * 100)));

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

    // 5. Critério Estrito Anti-Confusão:
    // - Confiança mínima elevada (>= 80%)
    // - Distância máxima baixa (< 0.72)
    // - Margem de separação mínima contra a segunda colocada (>= 0.22)
    const bestConfidence = scores[bestMatch] ? scores[bestMatch].confidence : 0;
    const isSeparated = (secondLowestDistance - lowestDistance) >= 0.22;
    const isStrictMatch = (lowestDistance < 0.72 && bestConfidence >= 80 && isSeparated);

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

    // 6. Extração do Contorno Periférico por Raycasting Radial (24 raios)
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const numRays = 24;
    const contourPoints = [];

    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const maxDist = Math.max(objWidth, objHeight) * 0.56;
      let foundX = centerX + cosA * maxDist;
      let foundY = centerY + sinA * maxDist;

      for (let r = maxDist; r >= 0; r -= 1.5) {
        const testX = Math.round(centerX + cosA * r);
        const testY = Math.round(centerY + sinA * r);
        if (testX >= 1 && testX < sampleSize - 1 && testY >= 1 && testY < sampleSize - 1) {
          if (edgeMap[testY * sampleSize + testX] === 1) {
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
        x: minX / sampleSize,
        y: minY / sampleSize,
        width: objWidth / sampleSize,
        height: objHeight / sampleSize
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

    // Filtro Temporal de Confirmação: Exige 5 confirmações consistentes na janela de 7 frames
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

    if (maxCount >= 5 && latestValidResult) {
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
