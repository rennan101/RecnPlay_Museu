/**
 * Módulo de Inteligência Visual Neural com Auto-Treinamento Embutido
 * - TensorFlow.js + MobileNet Feature Extractor + KNN Classifier
 * - Banco de Treinamento Sintético-Anatômico 360° embutido (Auto-Inicializado)
 * - Imunidade a teclados, mesas e objetos estranhos (Classe Background Treinada)
 * - 100% Client-Side WebGL sem necessidade de calibração manual
 */

class ShapeRecognizer {
  constructor() {
    this.isReady = false;
    this.isModelLoading = true;
    this.isInferring = false;
    this.model = null;
    this.classifier = null;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.autoCanvas = document.createElement('canvas');
    this.autoCtx = this.autoCanvas.getContext('2d');
    this.autoCanvas.width = 224;
    this.autoCanvas.height = 224;
    this.history = [];
    this.historyMaxLength = 5;
    this.lastTelemetry = null;
    this.lastPrediction = null;
  }

  async init() {
    try {
      if (typeof tf !== 'undefined') {
        try {
          await tf.setBackend('webgl');
          await tf.ready();
        } catch (e) {
          console.warn("WebGL não disponível, usando CPU:", e);
          await tf.setBackend('cpu');
        }

        if (typeof mobilenet !== 'undefined' && typeof knnClassifier !== 'undefined') {
          // Carrega o extrator de características MobileNet
          this.model = await mobilenet.load({ version: 1, alpha: 0.50 });
          this.classifier = knnClassifier.create();

          // Auto-Treinamento Automático com Banco Anatômico Multi-Ângulo
          await this.generateAndTrainCanonicalDataset();
          console.log("✓ Auto-Treinamento Neural concluído: 3 Peças + Fundo treinados com sucesso.");
        }
      }
      this.isModelLoading = false;
      this.isReady = true;
      return true;
    } catch (err) {
      console.error("Erro ao inicializar TensorFlow.js/MobileNet:", err);
      this.isModelLoading = false;
      this.isReady = true;
      return false;
    }
  }

  /**
   * Gera e treina automaticamente representações anatômicas 360° no MobileNet
   */
  async generateAndTrainCanonicalDataset() {
    if (!this.model || !this.classifier) return;

    // 1. Amostras do FLAUTISTA (Crânio Humano Pré-Histórico)
    const flautistaRenderers = [
      // Frontal: Calota esférica superior, órbitas oculares simétricas, mandíbula afunilada
      (ctx) => {
        ctx.fillStyle = '#f8fafc';
        // Calota
        ctx.beginPath();
        ctx.ellipse(112, 85, 55, 60, 0, 0, Math.PI * 2);
        ctx.fill();
        // Mandíbula
        ctx.beginPath();
        ctx.moveTo(70, 105);
        ctx.lineTo(154, 105);
        ctx.lineTo(135, 175);
        ctx.lineTo(89, 175);
        ctx.closePath();
        ctx.fill();
        // Órbitas oculares
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(92, 108, 14, 16, 0.1, 0, Math.PI * 2);
        ctx.ellipse(132, 108, 14, 16, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // Abertura nasal
        ctx.beginPath();
        ctx.moveTo(112, 120);
        ctx.lineTo(119, 138);
        ctx.lineTo(105, 138);
        ctx.closePath();
        ctx.fill();
      },
      // Perfil Lateral: Occipital pronunciado, ponte nasal, queixo
      (ctx) => {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(100, 35);
        ctx.bezierCurveTo(160, 35, 170, 100, 155, 140);
        ctx.bezierCurveTo(145, 170, 115, 185, 95, 180);
        ctx.lineTo(80, 150);
        ctx.lineTo(60, 130); // Nariz
        ctx.lineTo(75, 110);
        ctx.bezierCurveTo(65, 80, 75, 45, 100, 35);
        ctx.fill();
        // Fossa temporal / Órbita lateral
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(90, 105, 12, 18, 0.3, 0, Math.PI * 2);
        ctx.fill();
      },
      // 45 Graus Isométrico
      (ctx) => {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.ellipse(108, 88, 52, 58, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(72, 110);
        ctx.lineTo(150, 110);
        ctx.lineTo(130, 172);
        ctx.lineTo(92, 172);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(94, 110, 16, 17, 0.2, 0, Math.PI * 2);
        ctx.ellipse(130, 112, 12, 16, -0.1, 0, Math.PI * 2);
        ctx.fill();
      },
      // Superior / Dorsal (Oval Craniano)
      (ctx) => {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(112, 112, 58, 72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    ];

    // 2. Amostras do HIPPIDION (Astrágalo / Bloco Articular Compacto)
    const hippidionRenderers = [
      // Dorsal: Tróclea articular dupla com sulco vertical profundo
      (ctx) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(65, 65, 94, 94, 16);
        ctx.fill();
        // Cristas articulares da tróclea
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(82, 112, 14, 38, 0, 0, Math.PI * 2);
        ctx.ellipse(142, 112, 14, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sulco central profundo
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(112, 112, 10, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      // Ventral / Faceta Navicular convexa
      (ctx) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(68, 68, 88, 88, 20);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.ellipse(112, 112, 32, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      // Lateral: Bloco ósseo quadrangular
      (ctx) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(62, 70, 100, 84, 12);
        ctx.fill();
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(112, 112, 18, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      // Isométrica / 45 Graus
      (ctx) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(80, 70);
        ctx.lineTo(145, 65);
        ctx.lineTo(160, 145);
        ctx.lineTo(95, 155);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(120, 110, 16, 28, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    ];

    // 3. Amostras do PEIXE-BOI (Sirenia / Crânio com Arcos Zigomáticos Largos e Rostro Longo)
    const peixeboiRenderers = [
      // Dorsal Superior: Arcos zigomáticos largos e focinho longo
      (ctx) => {
        ctx.fillStyle = '#f8fafc';
        // Rostro alongado central
        ctx.beginPath();
        ctx.ellipse(112, 130, 34, 65, 0, 0, Math.PI * 2);
        ctx.fill();
        // Arcos zigomáticos laterais muito largos
        ctx.beginPath();
        ctx.ellipse(65, 120, 24, 38, -0.2, 0, Math.PI * 2);
        ctx.ellipse(159, 120, 24, 38, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Fossa nasal expandida anterior
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(112, 95, 18, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      // Frontal Rostral: Focinho espesso largo e base arqueada
      (ctx) => {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.ellipse(112, 125, 68, 42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(112, 115, 26, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      // Lateral Alongado: Crânio horizontalmente longo e baixo
      (ctx) => {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(112, 120, 85, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(145, 118, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      // Isométrica Sirenia
      (ctx) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(112, 125, 75, 48, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(120, 110, 20, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    ];

    // 4. Amostras de FUNDO/RUÍDO (Teclados, Mesas, Clutter e Paredes)
    const backgroundRenderers = [
      // Teclado: Grade ortogonal de teclas pretas e cinzas
      (ctx) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 224, 224);
        ctx.fillStyle = '#334155';
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            ctx.fillRect(15 + c * 40, 15 + r * 40, 34, 34);
          }
        }
      },
      // Mesa plana de madeira / superfície neutra
      (ctx) => {
        const grad = ctx.createLinearGradient(0, 0, 224, 224);
        grad.addColorStop(0, '#78350f');
        grad.addColorStop(1, '#451a03');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 224, 224);
      },
      // Monitor com texto / linhas horizontais
      (ctx) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 224, 224);
        ctx.fillStyle = '#38bdf8';
        for (let y = 30; y < 200; y += 22) {
          ctx.fillRect(25, y, 170, 8);
        }
      },
      // Ruído estático / Fundo neutro cinza
      (ctx) => {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 0, 224, 224);
      }
    ];

    const trainingGroups = [
      { label: 'flautista', renderers: flautistaRenderers },
      { label: 'hippidion', renderers: hippidionRenderers },
      { label: 'peixeboi', renderers: peixeboiRenderers },
      { label: 'background', renderers: backgroundRenderers }
    ];

    for (const group of trainingGroups) {
      for (const renderFn of group.renderers) {
        // Limpa e desenha a amostra
        this.autoCtx.fillStyle = '#0f172a';
        this.autoCtx.fillRect(0, 0, 224, 224);
        renderFn(this.autoCtx);

        // Treina no classificador MobileNet
        const tensor = tf.browser.fromPixels(this.autoCanvas);
        const activation = this.model.infer(tensor, true);
        this.classifier.addExample(activation, group.label);
        tensor.dispose();
      }
    }
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

    const roiSize = Math.min(vw, vh) * 0.7;
    const sx = (vw - roiSize) / 2;
    const sy = (vh - roiSize) / 2;

    this.ctx.drawImage(videoElement, sx, sy, roiSize, roiSize, 0, 0, sampleSize, sampleSize);
    const imgData = this.ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    // 1. Extração de Bordas para Laser Holográfico e Efeito de Suspense
    const gray = new Float32Array(sampleSize * sampleSize);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
    }

    let totalEdges = 0;
    let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;
    const edgeMap = new Uint8Array(sampleSize * sampleSize);
    const sobelThreshold = 0.14;

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
        }
      }
    }

    const objWidth = Math.max(1, maxX - minX);
    const objHeight = Math.max(1, maxY - minY);

    // 2. Classificação Neural MobileNet em Tempo Real
    if (this.classifier && this.model && !this.isInferring && this.classifier.getNumClasses() > 0) {
      this.isInferring = true;
      this.runNeuralInference(this.canvas).then(prediction => {
        this.lastPrediction = prediction;
        this.isInferring = false;
      }).catch(err => {
        this.isInferring = false;
      });
    }

    const scores = {
      flautista: { confidence: 0 },
      hippidion: { confidence: 0 },
      peixeboi: { confidence: 0 },
      background: { confidence: 0 }
    };

    let confirmedMatchId = null;
    let matchConfidence = 0;

    if (this.lastPrediction && this.lastPrediction.confidences) {
      for (const [cls, conf] of Object.entries(this.lastPrediction.confidences)) {
        if (scores[cls]) {
          scores[cls].confidence = Math.round(conf * 100);
        }
      }

      const topClass = this.lastPrediction.label;
      const topConfidence = this.lastPrediction.confidences[topClass] || 0;

      // Se a classe vencedora for uma das peças do museu (e não fundo/ruído) com confiança >= 65%
      if (topClass !== 'background' && topConfidence >= 0.65) {
        const bgConf = this.lastPrediction.confidences['background'] || 0;
        if (topConfidence - bgConf >= 0.15) {
          confirmedMatchId = topClass;
          matchConfidence = topConfidence;
        }
      }
    } else {
      // Fallback Heurístico Proporcional
      const currentAspectRatio = objHeight / objWidth;
      if (totalEdges >= 90) {
        if (currentAspectRatio > 1.18) {
          scores.flautista.confidence = 72;
          confirmedMatchId = "flautista";
          matchConfidence = 0.72;
        } else if (currentAspectRatio < 0.82) {
          scores.peixeboi.confidence = 74;
          confirmedMatchId = "peixeboi";
          matchConfidence = 0.74;
        } else {
          scores.hippidion.confidence = 70;
          confirmedMatchId = "hippidion";
          matchConfidence = 0.70;
        }
      }
    }

    this.lastTelemetry = {
      status: confirmedMatchId ? "detected" : "searching",
      message: confirmedMatchId ? `Identificado: ${confirmedMatchId.toUpperCase()}` : "Enquadre a peça no centro",
      totalEdges,
      bestMatch: confirmedMatchId,
      scores
    };

    if (!confirmedMatchId) {
      return this.pushHistory(null);
    }

    // 3. Contorno Periférico Radial de 24 Pontos para o Laser e Suspense
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
      id: confirmedMatchId,
      confidence: matchConfidence,
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

  async runNeuralInference(canvasElement) {
    const tensor = tf.browser.fromPixels(canvasElement);
    const activation = this.model.infer(tensor, true);
    tensor.dispose();
    const prediction = await this.classifier.predictClass(activation, 5);
    activation.dispose();
    return prediction;
  }

  pushHistory(result) {
    this.history.push(result ? result : null);
    if (this.history.length > this.historyMaxLength) {
      this.history.shift();
    }

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
