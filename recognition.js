/**
 * Módulo de Inteligência Visual Neural para Reconhecimento Fidedigno de Peças 3D
 * Utiliza TensorFlow.js + MobileNet Feature Extractor + KNN Classifier
 * Executado 100% no navegador (Client-Side WebGL)
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
    this.history = [];
    this.historyMaxLength = 5;
    this.lastTelemetry = null;
    this.lastPrediction = null;
    this.sampleCounts = {
      flautista: 0,
      hippidion: 0,
      peixeboi: 0,
      background: 0
    };
  }

  async init() {
    try {
      if (typeof tf !== 'undefined') {
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log("TensorFlow.js backend inicializado:", tf.getBackend());
        } catch (e) {
          console.warn("WebGL não disponível, usando CPU:", e);
          await tf.setBackend('cpu');
        }

        if (typeof mobilenet !== 'undefined' && typeof knnClassifier !== 'undefined') {
          // Carrega o extrator de características MobileNet
          this.model = await mobilenet.load({ version: 1, alpha: 0.50 });
          this.classifier = knnClassifier.create();
          console.log("MobileNet Feature Extractor carregado com sucesso.");

          // Restaura treinamento salvo no navegador se houver
          this.loadSavedDataset();
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
   * Adiciona um exemplo de treinamento em tempo real para a peça apontada na câmera
   */
  async addExample(label, videoElement) {
    if (!this.model || !this.classifier || !videoElement || videoElement.videoWidth === 0) return 0;

    const sampleSize = 224;
    this.canvas.width = sampleSize;
    this.canvas.height = sampleSize;

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    const roiSize = Math.min(vw, vh) * 0.7;
    const sx = (vw - roiSize) / 2;
    const sy = (vh - roiSize) / 2;

    this.ctx.drawImage(videoElement, sx, sy, roiSize, roiSize, 0, 0, sampleSize, sampleSize);

    // Converte o canvas para Tensor e extrai as ativações profundas do MobileNet
    const tensor = tf.browser.fromPixels(this.canvas);
    const activation = this.model.infer(tensor, true);

    this.classifier.addExample(activation, label);
    tensor.dispose();

    this.sampleCounts[label] = (this.sampleCounts[label] || 0) + 1;
    this.saveDataset();
    return this.sampleCounts[label];
  }

  /**
   * Limpa todo o treinamento salvo e reseta o classificador
   */
  clearDataset() {
    if (this.classifier) {
      this.classifier.clearAllClasses();
    }
    localStorage.removeItem('musarq_knn_dataset');
    this.sampleCounts = { flautista: 0, hippidion: 0, peixeboi: 0, background: 0 };
  }

  /**
   * Salva o dataset do classificador no LocalStorage do navegador
   */
  saveDataset() {
    if (!this.classifier || this.classifier.getNumClasses() === 0) return;
    try {
      const dataset = this.classifier.getClassifierDataset();
      const datasetObj = {};
      Object.keys(dataset).forEach((key) => {
        const data = dataset[key].dataSync();
        datasetObj[key] = {
          data: Array.from(data),
          shape: dataset[key].shape
        };
      });
      localStorage.setItem('musarq_knn_dataset', JSON.stringify(datasetObj));
      localStorage.setItem('musarq_knn_counts', JSON.stringify(this.sampleCounts));
    } catch (e) {
      console.warn("Erro ao salvar dataset no LocalStorage:", e);
    }
  }

  /**
   * Carrega o dataset previamente salvo do LocalStorage
   */
  loadSavedDataset() {
    try {
      const savedDataset = localStorage.getItem('musarq_knn_dataset');
      const savedCounts = localStorage.getItem('musarq_knn_counts');

      if (savedDataset && this.classifier) {
        const parsed = JSON.parse(savedDataset);
        const tensorObj = {};
        Object.keys(parsed).forEach((key) => {
          tensorObj[key] = tf.tensor(parsed[key].data, parsed[key].shape);
        });
        this.classifier.setClassifierDataset(tensorObj);

        if (savedCounts) {
          this.sampleCounts = JSON.parse(savedCounts);
        }
        console.log("Dataset KNN restaurado do LocalStorage com sucesso:", this.sampleCounts);
      }
    } catch (e) {
      console.warn("Erro ao carregar dataset salvo:", e);
    }
  }

  getSampleCounts() {
    return this.sampleCounts;
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

    // 1. Extração de Bordas para Contorno do Laser Holográfico e Efeito de Suspense
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

    // 2. Classificação com TensorFlow.js + MobileNet
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

      // Se a classe vencedora for uma das peças do museu (e não fundo/ruído) e tiver confiança >= 65%
      if (topClass !== 'background' && topConfidence >= 0.65) {
        const bgConf = this.lastPrediction.confidences['background'] || 0;
        if (topConfidence - bgConf >= 0.15) {
          confirmedMatchId = topClass;
          matchConfidence = topConfidence;
        }
      }
    } else {
      // Modo Heurístico Proporcional se o modelo neural ainda não tiver amostras
      const currentAspectRatio = objHeight / objWidth;
      const currentTopHeavy = (minY + objHeight * 0.45) / sampleSize;

      if (totalEdges >= 90) {
        if (currentAspectRatio > 1.15) {
          scores.flautista.confidence = 72;
          confirmedMatchId = "flautista";
          matchConfidence = 0.72;
        } else if (currentAspectRatio < 0.85) {
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

    // 3. Contorno Periférico Radial de 24 Pontos para Efeitos Visuais
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
    const prediction = await this.classifier.predictClass(activation, 5);
    tensor.dispose();
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
