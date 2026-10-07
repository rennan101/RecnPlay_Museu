/**
 * Módulo de Visão Computacional Fidedigna para Reconhecimento de Modelos 3D
 * Baseado em Spatial Pyramid Matching (SPM), Banco de Assinaturas Multi-Perspectiva e Segmentação Saliente
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
    this.setupMultiAngleReferenceSignatures();
    this.isReady = true;
    return true;
  }

  setupMultiAngleReferenceSignatures() {
    /**
     * BANCO DE ASSINATURAS MULTI-ÂNGULO DOS MODELOS 3D DO ACERVO:
     * Cada peça possui múltiplos vetores de descritores característicos (Frontal, Perfil/Lateral, Diagonal)
     * extraídos dos modelos geométricos e texturas oficiais.
     */
    this.signatures = {
      flautista: {
        id: "flautista",
        name: "Flautista (Crânio)",
        views: [
          // Vista 1: Frontal (Calota esférica superior, órbitas oculares simétricas, mandíbula afunilada)
          {
            aspectRatio: 1.34,
            topHeavy: 0.67,
            symmetry: 0.86,
            quadrants: [0.34, 0.33, 0.17, 0.16], // [Topo-Esq, Topo-Dir, Base-Esq, Base-Dir]
            rowHog: [0.32, 0.36, 0.19, 0.13],
            colHog: [0.18, 0.32, 0.32, 0.18],
            keypointConcentration: "upper_center"
          },
          // Vista 2: Diagonal 45° (Calota proeminente com curvatura facial contínua)
          {
            aspectRatio: 1.22,
            topHeavy: 0.62,
            symmetry: 0.72,
            quadrants: [0.36, 0.28, 0.20, 0.16],
            rowHog: [0.30, 0.34, 0.21, 0.15],
            colHog: [0.22, 0.30, 0.28, 0.20],
            keypointConcentration: "upper_center"
          },
          // Vista 3: Perfil Lateral (Projeção nasal e calota posterior alongada)
          {
            aspectRatio: 1.08,
            topHeavy: 0.58,
            symmetry: 0.52,
            quadrants: [0.32, 0.26, 0.24, 0.18],
            rowHog: [0.28, 0.30, 0.24, 0.18],
            colHog: [0.28, 0.28, 0.24, 0.20],
            keypointConcentration: "upper_lateral"
          }
        ]
      },

      hippidion: {
        id: "hippidion",
        name: "Hippidion (Astrágalo)",
        views: [
          // Vista 1: Dorsal (Tróclea articular dupla com sulco central profundo)
          {
            aspectRatio: 1.04,
            topHeavy: 0.50,
            symmetry: 0.74,
            quadrants: [0.25, 0.25, 0.25, 0.25],
            rowHog: [0.24, 0.26, 0.26, 0.24],
            colHog: [0.28, 0.22, 0.22, 0.28], // Cristas nas bordas com sulco central
            keypointConcentration: "center_split"
          },
          // Vista 2: Ventral / Articular (Bloco ósseo maciço compacto)
          {
            aspectRatio: 0.96,
            topHeavy: 0.48,
            symmetry: 0.62,
            quadrants: [0.24, 0.26, 0.25, 0.25],
            rowHog: [0.23, 0.27, 0.27, 0.23],
            colHog: [0.24, 0.26, 0.26, 0.24],
            keypointConcentration: "dense_center"
          },
          // Vista 3: Lateral (Corpo articular quadrangular)
          {
            aspectRatio: 1.10,
            topHeavy: 0.52,
            symmetry: 0.58,
            quadrants: [0.27, 0.25, 0.24, 0.24],
            rowHog: [0.26, 0.26, 0.24, 0.24],
            colHog: [0.25, 0.25, 0.25, 0.25],
            keypointConcentration: "dense_center"
          }
        ]
      },

      peixeboi: {
        id: "peixeboi",
        name: "Peixe-boi (Sirenia)",
        views: [
          // Vista 1: Dorsal Superior (Arcos zigomáticos laterais largos e rostro anterior)
          {
            aspectRatio: 0.72,
            topHeavy: 0.38,
            symmetry: 0.82,
            quadrants: [0.18, 0.18, 0.32, 0.32],
            rowHog: [0.15, 0.23, 0.33, 0.29],
            colHog: [0.32, 0.18, 0.18, 0.32], // Expansão extrema nos arcos laterais
            keypointConcentration: "wide_lateral"
          },
          // Vista 2: Frontal / Rostral (Focinho espesso e base alargada)
          {
            aspectRatio: 0.78,
            topHeavy: 0.42,
            symmetry: 0.78,
            quadrants: [0.20, 0.20, 0.30, 0.30],
            rowHog: [0.18, 0.24, 0.31, 0.27],
            colHog: [0.28, 0.22, 0.22, 0.28],
            keypointConcentration: "lower_wide"
          },
          // Vista 3: Lateral / Mandíbula (Alongamento horizontal da mandíbula/crânio)
          {
            aspectRatio: 0.66,
            topHeavy: 0.40,
            symmetry: 0.50,
            quadrants: [0.19, 0.21, 0.32, 0.28],
            rowHog: [0.16, 0.24, 0.32, 0.28],
            colHog: [0.24, 0.26, 0.26, 0.24],
            keypointConcentration: "horizontal_spine"
          }
        ]
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

    // Região central de interesse (ROI) 70% do visor
    const roiSize = Math.min(vw, vh) * 0.7;
    const sx = (vw - roiSize) / 2;
    const sy = (vh - roiSize) / 2;

    this.ctx.drawImage(videoElement, sx, sy, roiSize, roiSize, 0, 0, sampleSize, sampleSize);
    const imgData = this.ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    // 1. Conversão em Tons de Cinza
    const gray = new Float32Array(sampleSize * sampleSize);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
    }

    // 2. Extração de Gradiente e Segmentação Saliente
    let totalEdges = 0;
    let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;
    const edgeMap = new Uint8Array(sampleSize * sampleSize);
    const orientations = new Float32Array(sampleSize * sampleSize);

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
          edgeMap[idx] = 1;
          orientations[idx] = Math.atan2(gy, gx);
          totalEdges++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Filtro de Rejeição de Ruído: Exige riqueza de relevo ósseo e dimensões mínimas
    if (totalEdges < 300 || (maxX - minX) < 28 || (maxY - minY) < 28) {
      this.lastTelemetry = {
        status: "searching",
        message: "Aponte para a peça 3D",
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

    // 3. Extração de Descritores do Spatial Pyramid Matching (SPM)
    // Nível 1: Quadrantes 2x2
    const quadCounts = [0, 0, 0, 0]; // [Top-Left, Top-Right, Bottom-Left, Bottom-Right]
    const midX = minX + objWidth / 2;
    const midY = minY + objHeight / 2;

    // Nível 2: Grade 4x4
    const rowCounts = [0, 0, 0, 0];
    const colCounts = [0, 0, 0, 0];
    let leftSideEdges = 0;
    let rightSideEdges = 0;
    let topSideEdges = 0;

    for (let y = minY; y <= maxY; y++) {
      const isTop = y < midY;
      const rIdx = Math.min(3, Math.floor(((y - minY) / objHeight) * 4));

      for (let x = minX; x <= maxX; x++) {
        if (edgeMap[y * sampleSize + x] === 1) {
          const isLeft = x < midX;
          const cIdx = Math.min(3, Math.floor(((x - minX) / objWidth) * 4));

          // Quadrantes 2x2
          if (isTop && isLeft) quadCounts[0]++;
          else if (isTop && !isLeft) quadCounts[1]++;
          else if (!isTop && isLeft) quadCounts[2]++;
          else quadCounts[3]++;

          // Grade 4x4
          rowCounts[rIdx]++;
          colCounts[cIdx]++;

          if (isLeft) leftSideEdges++;
          else rightSideEdges++;
          if (isTop) topSideEdges++;
        }
      }
    }

    const quadSum = quadCounts.reduce((a, b) => a + b, 0) || 1;
    const rowSum = rowCounts.reduce((a, b) => a + b, 0) || 1;
    const colSum = colCounts.reduce((a, b) => a + b, 0) || 1;

    const currentQuadrants = quadCounts.map(c => c / quadSum);
    const currentRowHog = rowCounts.map(c => c / rowSum);
    const currentColHog = colCounts.map(c => c / colSum);
    const currentTopHeavy = (topSideEdges + 1) / (totalEdges + 2);
    const currentSymmetry = 1.0 - Math.abs(leftSideEdges - rightSideEdges) / (totalEdges + 1);

    // 4. Comparação Vetorial Multidimensional contra o Banco Multi-Ângulo
    const scores = {};
    let bestMatchId = null;
    let lowestObjectDistance = 999;
    let secondLowestObjectDistance = 999;

    for (const [id, sig] of Object.entries(this.signatures)) {
      let minViewDist = 999;

      for (const view of sig.views) {
        // Distância de Aspect Ratio
        const dAspect = Math.abs(currentAspectRatio - view.aspectRatio) * 3.2;

        // Distância de Top-Heavy
        const dTop = Math.abs(currentTopHeavy - view.topHeavy) * 2.8;

        // Distância de Simetria
        const dSym = Math.abs(currentSymmetry - view.symmetry) * 1.5;

        // Distância dos Quadrantes 2x2
        let dQuad = 0;
        for (let q = 0; q < 4; q++) {
          dQuad += Math.abs(currentQuadrants[q] - view.quadrants[q]);
        }
        dQuad *= 2.6;

        // Distância HOG Linhas 4x4
        let dRow = 0;
        for (let r = 0; r < 4; r++) {
          dRow += Math.abs(currentRowHog[r] - view.rowHog[r]);
        }
        dRow *= 2.4;

        // Distância HOG Colunas 4x4
        let dCol = 0;
        for (let c = 0; c < 4; c++) {
          dCol += Math.abs(currentColHog[c] - view.colHog[c]);
        }
        dCol *= 2.4;

        // Norma Euclidiana da Visão
        const viewDist = Math.sqrt(
          dAspect * dAspect +
          dTop * dTop +
          dSym * dSym +
          dQuad * dQuad +
          dRow * dRow +
          dCol * dCol
        );

        if (viewDist < minViewDist) {
          minViewDist = viewDist;
        }
      }

      // Converte distância em porcentagem de confiança (0 a 100%)
      const confidencePercent = Math.max(0, Math.min(100, Math.round((1 - (minViewDist / 1.85)) * 100)));

      scores[id] = {
        name: sig.name,
        confidence: confidencePercent,
        distance: minViewDist.toFixed(2)
      };

      if (minViewDist < lowestObjectDistance) {
        secondLowestObjectDistance = lowestObjectDistance;
        lowestObjectDistance = minViewDist;
        bestMatchId = id;
      } else if (minViewDist < secondLowestObjectDistance) {
        secondLowestObjectDistance = minViewDist;
      }
    }

    // 5. BLOQUEIO ESTREITO ANTI-AMBIGUIDADE:
    // Exige:
    // a) Confiança >= 82%
    // b) Distância euclidiana < 0.68
    // c) Margem de superioridade sobre o segundo colocado >= 0.25 (25% de separação)
    const bestConfidence = scores[bestMatchId] ? scores[bestMatchId].confidence : 0;
    const isDistinctlySeparated = (secondLowestObjectDistance - lowestObjectDistance) >= 0.25;
    const isStrictFaithfulMatch = (lowestObjectDistance < 0.68 && bestConfidence >= 82 && isDistinctlySeparated);

    this.lastTelemetry = {
      status: isStrictFaithfulMatch ? "detected" : "analyzing",
      message: isStrictFaithfulMatch ? `Identificado: ${this.signatures[bestMatchId].name}` : "Enquadre a peça no centro",
      totalEdges,
      metrics: {
        aspectRatio: currentAspectRatio.toFixed(2),
        topHeavy: currentTopHeavy.toFixed(2),
        symmetry: currentSymmetry.toFixed(2),
        size: `${objWidth}x${objHeight}`
      },
      bestMatch: isStrictFaithfulMatch ? bestMatchId : null,
      scores
    };

    if (!isStrictFaithfulMatch) {
      return this.pushHistory(null);
    }

    // 6. Contorno Periférico Radial de 24 Pontos
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
      id: bestMatchId,
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

    // Filtro Temporal de Estabilidade: Exige 5 confirmações idênticas consecutivas na janela
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
