/**
 * Módulo Orquestrador de Reconhecimento Visual Multi-Modal
 * Integra MobileNet (v1, alpha 0.50) com classificador KNN treinado
 * no acervo de fotos reais das peças físicas do museu.
 */

class ShapeRecognizer {
  constructor() {
    this.isReady = false;
    this.isModelLoading = true;
    this.isInferring = false;
    this.model = null;
    this.classifier = null;
    this.sampleSize = 128;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.history = [];
    this.historyMaxLength = 5;
    this.lastTelemetry = null;
    this.lastPrediction = null;

    this.colorValidator = new ColorProfileValidator();
    this.featureExtractor = new FeatureExtractor({ sobelThreshold: 0.14 });
  }

  async init() {
    try {
      if (typeof tf !== 'undefined') {
        try {
          await tf.setBackend('webgl');
          await tf.ready();
        } catch (backendErr) {
          console.warn('WebGL indisponível, chaveando para CPU:', backendErr);
          await tf.setBackend('cpu');
          await tf.ready();
        }

        if (typeof mobilenet !== 'undefined' && typeof knnClassifier !== 'undefined') {
          this.model = await mobilenet.load({ version: 1, alpha: 0.50 });
          this.classifier = knnClassifier.create();

          const loadedFromJson = await this.tryLoadDatasetJson('assets/model/knn_dataset.json');
          if (!loadedFromJson) {
            await this.trainFromCatalog();
          }
        }
      }
      this.isModelLoading = false;
      this.isReady = true;
      return true;
    } catch (err) {
      console.error('Falha na inicialização do ShapeRecognizer:', err);
      this.isModelLoading = false;
      this.isReady = true;
      return false;
    }
  }

  /**
   * Tenta carregar os tensores pré-calculados do classificador KNN em <15ms
   */
  async tryLoadDatasetJson(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return false;
      const raw = await resp.json();
      const dataset = {};
      for (const [label, data] of Object.entries(raw)) {
        dataset[label] = tf.tensor2d(data.values, data.shape);
      }
      this.classifier.setClassifierDataset(dataset);
      console.log('✓ Classificador carregado com sucesso via JSON pré-calculado.');
      return true;
    } catch (e) {
      console.info('Dataset pré-calculado não disponível, iniciando treino dinâmico.');
      return false;
    }
  }

  /**
   * Treina o classificador KNN com as fotos reais otimizadas do acervo
   */
  async trainFromCatalog() {
    const catalog = window.DATASET_CATALOG;
    if (!catalog || !this.model || !this.classifier) return;

    const trainCanvas = document.createElement('canvas');
    trainCanvas.width = 224;
    trainCanvas.height = 224;
    const tCtx = trainCanvas.getContext('2d');

    for (const [label, paths] of Object.entries(catalog)) {
      for (const p of paths) {
        try {
          const img = await this.loadImage(p);
          // Amostra 1: imagem central original
          tCtx.fillStyle = '#000000';
          tCtx.fillRect(0, 0, 224, 224);
          tCtx.drawImage(img, 0, 0, 224, 224);
          this.addExample(trainCanvas, label);

          // Amostra 2: espelhamento horizontal (simula aproximação oposta)
          tCtx.save();
          tCtx.translate(224, 0);
          tCtx.scale(-1, 1);
          tCtx.drawImage(img, 0, 0, 224, 224);
          tCtx.restore();
          this.addExample(trainCanvas, label);
        } catch (imgErr) {
          console.warn(`Foto ${p} ignorada no treino:`, imgErr);
        }
      }
    }

    // Amostras da classe negativa (background e superfícies)
    const bgColors = ['#0f172a', '#1e293b', '#475569', '#3f2e1e', '#1c1917', '#000000', '#78350f'];
    for (const color of bgColors) {
      tCtx.fillStyle = color;
      tCtx.fillRect(0, 0, 224, 224);
      tCtx.fillStyle = '#334155';
      tCtx.fillRect(30, 30, 80, 80);
      tCtx.fillRect(120, 110, 70, 70);
      this.addExample(trainCanvas, 'background');
    }

    console.log(`✓ Treinamento neural concluído: ${this.classifier.getNumClasses()} classes ativas.`);
  }

  addExample(canvasEl, label) {
    const tensor = tf.browser.fromPixels(canvasEl);
    const activation = this.model.infer(tensor, true);
    this.classifier.addExample(activation, label);
    tensor.dispose();
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  getTelemetry() {
    return this.lastTelemetry;
  }

  processFrame(videoElement) {
    if (!this.isReady || !videoElement || videoElement.videoWidth === 0) return null;

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    const sSize = this.sampleSize;
    this.canvas.width = sSize;
    this.canvas.height = sSize;

    const roiSize = Math.min(vw, vh) * 0.7;
    const sx = (vw - roiSize) / 2;
    const sy = (vh - roiSize) / 2;

    this.ctx.drawImage(videoElement, sx, sy, roiSize, roiSize, 0, 0, sSize, sSize);
    const imgData = this.ctx.getImageData(0, 0, sSize, sSize);

    // 1. Extração Espacial de Bordas Sobel
    const edges = this.featureExtractor.extractEdges(imgData.data, sSize);

    // 2. Extração Cromática HSL
    const color = this.colorValidator.extract(imgData, edges.minX, edges.maxX, edges.minY, edges.maxY, sSize);

    // 3. Inferência Neural MobileNet + KNN
    if (this.classifier && this.model && !this.isInferring && this.classifier.getNumClasses() > 0) {
      this.isInferring = true;
      this.runNeuralInference(this.canvas)
        .then((pred) => {
          this.lastPrediction = pred;
          this.isInferring = false;
        })
        .catch(() => {
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
        if (scores[cls]) scores[cls].confidence = Math.round(conf * 100);
      }

      const topClass = this.lastPrediction.label;
      const topConfidence = this.lastPrediction.confidences[topClass] || 0;
      const bgConfidence = this.lastPrediction.confidences['background'] || 0;

      // Validação Multi-Modal:
      // a) Confiança neural >= 60% com margem de 10% sobre background
      // b) Validação de plausibilidade cromática conforme as fotos do acervo
      // c) Densidade de bordas >= 65 pixels para rejeitar paredes ou telas lisas
      if (topClass !== 'background' && topConfidence >= 0.60 && (topConfidence - bgConfidence) >= 0.10) {
        const isColorValid = this.colorValidator.matches(topClass, color);
        if (isColorValid && edges.totalEdges >= 65) {
          confirmedMatchId = topClass;
          matchConfidence = topConfidence;
        }
      }
    }

    this.lastTelemetry = {
      status: confirmedMatchId ? 'detected' : 'searching',
      message: confirmedMatchId ? `Identificado: ${confirmedMatchId.toUpperCase()}` : 'Enquadre a peça no centro',
      totalEdges: edges.totalEdges,
      color: `H:${color.h}° S:${Math.round(color.s * 100)}% L:${Math.round(color.l * 100)}%`,
      bestMatch: confirmedMatchId,
      scores
    };

    if (!confirmedMatchId) {
      return this.pushHistory(null);
    }

    // Traça contorno periférico radial de 24 pontos para o HUD
    const contour = this.featureExtractor.computeRadialContour(
      edges.edgeMap,
      edges.minX,
      edges.maxX,
      edges.minY,
      edges.maxY,
      edges.objWidth,
      edges.objHeight,
      sSize
    );

    return this.pushHistory({
      id: confirmedMatchId,
      confidence: matchConfidence,
      bbox: {
        x: edges.minX / sSize,
        y: edges.minY / sSize,
        width: edges.objWidth / sSize,
        height: edges.objHeight / sSize
      },
      contour
    });
  }

  async runNeuralInference(canvasEl) {
    const tensor = tf.browser.fromPixels(canvasEl);
    const activation = this.model.infer(tensor, true);
    tensor.dispose();
    const pred = await this.classifier.predictClass(activation, 5);
    activation.dispose();
    return pred;
  }

  pushHistory(result) {
    this.history.push(result || null);
    if (this.history.length > this.historyMaxLength) this.history.shift();

    const counts = {};
    let maxId = null;
    let maxCount = 0;
    let latestValid = null;

    for (const item of this.history) {
      if (!item) continue;
      counts[item.id] = (counts[item.id] || 0) + 1;
      if (counts[item.id] > maxCount) {
        maxCount = counts[item.id];
        maxId = item.id;
        latestValid = item;
      }
    }

    if (maxCount >= 3 && latestValid) {
      return {
        id: maxId,
        confidence: latestValid.confidence,
        bbox: latestValid.bbox,
        contour: latestValid.contour
      };
    }

    return null;
  }
}

window.ShapeRecognizer = ShapeRecognizer;
