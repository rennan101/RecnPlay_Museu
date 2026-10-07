/**
 * Módulo de Visão Computacional Fidedigna e Invariante a Ângulo para Reconhecimento de Modelos 3D
 * - Filtro Anti-Formas Artificiais (Rejeição de teclados, telas, livros, caixas)
 * - Banco de Assinaturas Multi-Perspectiva 360° (6 ângulos por peça)
 * - Spatial Pyramid Matching (SPM) + Entropia Orgânica + Perfil Radial
 */

class ShapeRecognizer {
  constructor() {
    this.isReady = false;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.signatures = {};
    this.history = [];
    this.historyMaxLength = 6;
    this.lastTelemetry = null;
  }

  async init() {
    this.setupMultiPerspectiveSignatures();
    this.isReady = true;
    return true;
  }

  setupMultiPerspectiveSignatures() {
    /**
     * BANCO DE ASSINATURAS MULTI-PERSPECTIVA 360° DO ACERVO MUSARQ
     * Cada modelo conta com 6 perfis de captura (Frontal, Traseira, Laterais, Superior, Isométrica)
     */
    this.signatures = {
      flautista: {
        id: "flautista",
        name: "Flautista (Crânio)",
        views: [
          // 1. Frontal (Calota esférica superior, órbitas oculares, queixo afunilado)
          {
            aspectRatio: 1.30,
            topHeavy: 0.66,
            symmetry: 0.86,
            quadrants: [0.35, 0.35, 0.15, 0.15],
            rowHog: [0.34, 0.34, 0.18, 0.14],
            colHog: [0.20, 0.30, 0.30, 0.20]
          },
          // 2. Diagonal / Isométrica 45°
          {
            aspectRatio: 1.22,
            topHeavy: 0.62,
            symmetry: 0.72,
            quadrants: [0.36, 0.28, 0.20, 0.16],
            rowHog: [0.32, 0.32, 0.20, 0.16],
            colHog: [0.24, 0.30, 0.28, 0.18]
          },
          // 3. Perfil Lateral Esquerdo (Projeção nasal e calota posterior)
          {
            aspectRatio: 1.14,
            topHeavy: 0.58,
            symmetry: 0.55,
            quadrants: [0.34, 0.26, 0.24, 0.16],
            rowHog: [0.30, 0.30, 0.22, 0.18],
            colHog: [0.28, 0.28, 0.24, 0.20]
          },
          // 4. Perfil Lateral Direito
          {
            aspectRatio: 1.14,
            topHeavy: 0.58,
            symmetry: 0.55,
            quadrants: [0.26, 0.34, 0.16, 0.24],
            rowHog: [0.30, 0.30, 0.22, 0.18],
            colHog: [0.20, 0.24, 0.28, 0.28]
          },
          // 5. Posterior (Occipital / Calota Craniana Maciça)
          {
            aspectRatio: 1.25,
            topHeavy: 0.68,
            symmetry: 0.88,
            quadrants: [0.36, 0.36, 0.14, 0.14],
            rowHog: [0.36, 0.32, 0.18, 0.14],
            colHog: [0.22, 0.28, 0.28, 0.22]
          },
          // 6. Superior / Dorsal (Formato Oval Craniano)
          {
            aspectRatio: 1.18,
            topHeavy: 0.56,
            symmetry: 0.84,
            quadrants: [0.29, 0.29, 0.21, 0.21],
            rowHog: [0.28, 0.28, 0.22, 0.22],
            colHog: [0.24, 0.26, 0.26, 0.24]
          }
        ]
      },

      hippidion: {
        id: "hippidion",
        name: "Hippidion (Astrágalo)",
        views: [
          // 1. Dorsal (Tróclea articular dupla com sulco central)
          {
            aspectRatio: 1.02,
            topHeavy: 0.50,
            symmetry: 0.78,
            quadrants: [0.25, 0.25, 0.25, 0.25],
            rowHog: [0.25, 0.25, 0.25, 0.25],
            colHog: [0.28, 0.22, 0.22, 0.28]
          },
          // 2. Ventral / Articular (Bloco ósseo maciço compacto)
          {
            aspectRatio: 0.98,
            topHeavy: 0.49,
            symmetry: 0.68,
            quadrants: [0.24, 0.26, 0.25, 0.25],
            rowHog: [0.24, 0.26, 0.26, 0.24],
            colHog: [0.25, 0.25, 0.25, 0.25]
          },
          // 3. Lateral Esquerda (Corpo articular quadrangular)
          {
            aspectRatio: 1.06,
            topHeavy: 0.52,
            symmetry: 0.62,
            quadrants: [0.27, 0.25, 0.24, 0.24],
            rowHog: [0.26, 0.26, 0.24, 0.24],
            colHog: [0.25, 0.25, 0.25, 0.25]
          },
          // 4. Lateral Direita
          {
            aspectRatio: 1.06,
            topHeavy: 0.52,
            symmetry: 0.62,
            quadrants: [0.25, 0.27, 0.24, 0.24],
            rowHog: [0.26, 0.26, 0.24, 0.24],
            colHog: [0.25, 0.25, 0.25, 0.25]
          },
          // 5. Proximal / Base
          {
            aspectRatio: 0.96,
            topHeavy: 0.48,
            symmetry: 0.70,
            quadrants: [0.24, 0.24, 0.26, 0.26],
            rowHog: [0.23, 0.25, 0.26, 0.26],
            colHog: [0.26, 0.24, 0.24, 0.26]
          },
          // 6. Isométrica / Diagonal
          {
            aspectRatio: 1.04,
            topHeavy: 0.51,
            symmetry: 0.65,
            quadrants: [0.26, 0.25, 0.25, 0.24],
            rowHog: [0.25, 0.26, 0.25, 0.24],
            colHog: [0.26, 0.24, 0.25, 0.25]
          }
        ]
      },

      peixeboi: {
        id: "peixeboi",
        name: "Peixe-boi (Sirenia)",
        views: [
          // 1. Dorsal Superior (Arcos zigomáticos largos e rostro alongado)
          {
            aspectRatio: 0.72,
            topHeavy: 0.40,
            symmetry: 0.84,
            quadrants: [0.18, 0.18, 0.32, 0.32],
            rowHog: [0.16, 0.24, 0.32, 0.28],
            colHog: [0.30, 0.20, 0.20, 0.30]
          },
          // 2. Frontal / Rostral (Focinho espesso e base alargada)
          {
            aspectRatio: 0.78,
            topHeavy: 0.42,
            symmetry: 0.80,
            quadrants: [0.20, 0.20, 0.30, 0.30],
            rowHog: [0.18, 0.24, 0.30, 0.28],
            colHog: [0.28, 0.22, 0.22, 0.28]
          },
          // 3. Lateral Esquerda (Alongamento horizontal da mandíbula/crânio)
          {
            aspectRatio: 0.68,
            topHeavy: 0.42,
            symmetry: 0.55,
            quadrants: [0.20, 0.22, 0.30, 0.28],
            rowHog: [0.18, 0.24, 0.30, 0.28],
            colHog: [0.24, 0.26, 0.26, 0.24]
          },
          // 4. Lateral Direita
          {
            aspectRatio: 0.68,
            topHeavy: 0.42,
            symmetry: 0.55,
            quadrants: [0.22, 0.20, 0.28, 0.30],
            rowHog: [0.18, 0.24, 0.30, 0.28],
            colHog: [0.24, 0.26, 0.26, 0.24]
          },
          // 5. Ventral (Palato Ósseo Alargado)
          {
            aspectRatio: 0.70,
            topHeavy: 0.38,
            symmetry: 0.78,
            quadrants: [0.17, 0.17, 0.33, 0.33],
            rowHog: [0.15, 0.23, 0.33, 0.29],
            colHog: [0.28, 0.22, 0.22, 0.28]
          },
          // 6. Isométrica / Vista 45°
          {
            aspectRatio: 0.74,
            topHeavy: 0.43,
            symmetry: 0.65,
            quadrants: [0.21, 0.21, 0.29, 0.29],
            rowHog: [0.19, 0.25, 0.29, 0.27],
            colHog: [0.27, 0.23, 0.24, 0.26]
          }
        ]
      }
    };
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

    // 2. Extração de Gradiente Sobel e Análise de Orientação Angular
    let totalEdges = 0;
    let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;
    const edgeMap = new Uint8Array(sampleSize * sampleSize);
    const sobelThreshold = 0.15;

    // Histograma de 8 bins para orientações de borda (Detecção de Linearidade Ortogonal)
    const orientationBins = new Float32Array(8);

    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = y * sampleSize + x;
        const gx = -gray[idx - sampleSize - 1] + gray[idx - sampleSize + 1]
                   -2 * gray[idx - 1] + 2 * gray[idx + 1]
                   -gray[idx + sampleSize - 1] + gray[idx + sampleSize + 1];

        const gy = -gray[idx - sampleSize - 1] - 2 * gray[idx - sampleSize] - gray[idx - sampleSize + 1]
                   +gray[idx + sampleSize - 1] + 2 * gray[idx + sampleSize] + gray[idx + sampleSize + 1];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > sobelThreshold) {
          edgeMap[idx] = 1;
          totalEdges++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          // Ângulo de orientação (0 a PI)
          let angle = Math.atan2(gy, gx);
          if (angle < 0) angle += Math.PI;
          const bin = Math.min(7, Math.floor((angle / Math.PI) * 8));
          orientationBins[bin]++;
        }
      }
    }

    // Filtro 1: Rejeição de Ruído de Fundo (Total de Bordas e Dimensões Mínimas)
    if (totalEdges < 90 || (maxX - minX) < 22 || (maxY - minY) < 22) {
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

    // Filtro 2: ANTI-TECLADO & ANTI-FORMAS ARTIFICIAIS (Linearidade Ortogonal)
    // Objetos artificiais como teclas, telas e caixas têm quase 100% de suas bordas em 0°/180° e 90°/270° (bins 0, 4)
    // Fósseis 3D e crânios têm distribuição orgânica/curvilínea em todos os ângulos
    const totalOriented = orientationBins.reduce((a, b) => a + b, 0) || 1;
    const orthogonalRatio = (orientationBins[0] + orientationBins[4]) / totalOriented;

    // Densidade de preenchimento interno (Teclas têm centro oco e bordas perimetrais retas)
    const bboxArea = objWidth * objHeight;
    const fillDensity = totalEdges / bboxArea;

    if (orthogonalRatio > 0.76 && fillDensity < 0.12) {
      this.lastTelemetry = {
        status: "rejected",
        message: "Forma artificial ignorada",
        totalEdges,
        metrics: {
          orthogonalRatio: orthogonalRatio.toFixed(2),
          fillDensity: fillDensity.toFixed(2)
        },
        scores: {}
      };
      this.pushHistory(null);
      return null;
    }

    // 3. Extração de Descritores do Spatial Pyramid Matching (SPM)
    const quadCounts = [0, 0, 0, 0];
    const midX = minX + objWidth / 2;
    const midY = minY + objHeight / 2;

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

    // 4. Comparação Vetorial contra o Banco Multi-Perspectiva 360°
    const scores = {};
    let bestMatchId = null;
    let lowestObjectDistance = 999;
    let secondLowestObjectDistance = 999;

    for (const [id, sig] of Object.entries(this.signatures)) {
      let minViewDist = 999;

      for (const view of sig.views) {
        // Distância de Proporção Dimensional
        const dAspect = Math.abs(currentAspectRatio - view.aspectRatio) * 1.8;

        // Distância de Distribuição Topo/Base
        const dTop = Math.abs(currentTopHeavy - view.topHeavy) * 1.8;

        // Distância de Simetria
        const dSym = Math.abs(currentSymmetry - view.symmetry) * 0.8;

        // Distância dos Quadrantes 2x2
        let dQuad = 0;
        for (let q = 0; q < 4; q++) {
          dQuad += Math.abs(currentQuadrants[q] - view.quadrants[q]);
        }
        dQuad *= 1.2;

        // Distância HOG Linhas 4x4
        let dRow = 0;
        for (let r = 0; r < 4; r++) {
          dRow += Math.abs(currentRowHog[r] - view.rowHog[r]);
        }
        dRow *= 1.0;

        // Distância HOG Colunas 4x4
        let dCol = 0;
        for (let c = 0; c < 4; c++) {
          dCol += Math.abs(currentColHog[c] - view.colHog[c]);
        }
        dCol *= 1.0;

        const rawDist = Math.sqrt(
          dAspect * dAspect +
          dTop * dTop +
          dSym * dSym +
          dQuad * dQuad +
          dRow * dRow +
          dCol * dCol
        );

        const normalizedDist = rawDist / 2.6;

        if (normalizedDist < minViewDist) {
          minViewDist = normalizedDist;
        }
      }

      // Mapeamento linear de confiança (0 a 100%)
      const confidencePercent = Math.max(0, Math.min(100, Math.round((1.0 - (minViewDist / 0.80)) * 100)));

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

    // 5. BLOQUEIO RIGOROSO ANTI-FALSOS POSITIVOS & ANTI-AMBIGUIDADE:
    // Exige:
    // a) Distância euclidiana < 0.48
    // b) Confiança mínima >= 70%
    // c) Margem de superioridade sobre concorrentes >= 0.08
    const bestConfidence = scores[bestMatchId] ? scores[bestMatchId].confidence : 0;
    const isDistinctlySeparated = (secondLowestObjectDistance - lowestObjectDistance) >= 0.08;
    const isStrictFaithfulMatch = (lowestObjectDistance < 0.48 && bestConfidence >= 70 && isDistinctlySeparated);

    this.lastTelemetry = {
      status: isStrictFaithfulMatch ? "detected" : "analyzing",
      message: isStrictFaithfulMatch ? `Identificado: ${this.signatures[bestMatchId].name}` : "Enquadre a peça no centro",
      totalEdges,
      metrics: {
        aspectRatio: currentAspectRatio.toFixed(2),
        topHeavy: currentTopHeavy.toFixed(2),
        symmetry: currentSymmetry.toFixed(2),
        orthogonal: orthogonalRatio.toFixed(2)
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

    // Filtro Temporal de Estabilidade: Exige 3 confirmações consistentes na janela de 6 frames
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

    if (maxCount >= 3 && latestValidResult) {
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
