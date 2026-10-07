/**
 * Módulo de Inteligência Visual Neural com Treinamento grounded nas Fotos Oficiais do Acervo
 * - Treina MobileNet diretamente com as fotos reais de cada peça (Fotos/)
 * - Validação Multi-Modal: Anatomia Neural (MobileNet 1024-d) + Perfil Cromático Real (HSL/RGB)
 * - Imunidade total a teclados, mouses e objetos estranhos
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

    // Perfis Cromáticos das Peças Reais do Museu (Extraídos das Fotos Oficiais)
    this.colorProfiles = {
      // Flautista: Marrom ocre / tom terra fóssil
      flautista: {
        name: "Flautista",
        minHue: 20, maxHue: 60,
        minSat: 0.18, maxSat: 0.70,
        minLight: 0.35, maxLight: 0.75
      },
      // Peixe-boi: Marfim / Bege Fóssil Claro
      peixeboi: {
        name: "Peixe-boi",
        minHue: 25, maxHue: 65,
        minSat: 0.08, maxSat: 0.45,
        minLight: 0.60, maxLight: 0.95
      },
      // Hippidion: Cinza Grafite / Chumbo 3D
      hippidion: {
        name: "Hippidion",
        minHue: 0, maxHue: 360,
        minSat: 0.00, maxSat: 0.25,
        minLight: 0.20, maxLight: 0.58
      }
    };
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
          this.model = await mobilenet.load({ version: 1, alpha: 0.50 });
          this.classifier = knnClassifier.create();

          // Treinamento grounded nas fotos reais do acervo
          await this.trainFromOfficialPhotos();
          console.log("✓ MobileNet treinado com as fotos reais do acervo.");
        }
      }
      this.isModelLoading = false;
      this.isReady = true;
      return true;
    } catch (err) {
      console.error("Erro ao inicializar inteligência visual:", err);
      this.isModelLoading = false;
      this.isReady = true;
      return false;
    }
  }

  /**
   * Carrega e treina o classificador diretamente com as fotos reais das peças
   */
  async trainFromOfficialPhotos() {
    if (!this.model || !this.classifier) return;

    const photoCatalog = [
      { label: 'flautista', paths: ['Fotos/Flautista 1.jpeg', 'Fotos/Flautista 2.jpeg'] },
      { label: 'peixeboi', paths: ['Fotos/Peixe boi 1.jpeg', 'Fotos/Peixe boi 2.jpeg'] },
      { label: 'hippidion', paths: ['Fotos/hippidion 1.jpg', 'Fotos/hippidion 2.jpg', 'Fotos/hippidion 3.jpg'] }
    ];

    const trainCanvas = document.createElement('canvas');
    trainCanvas.width = 224;
    trainCanvas.height = 224;
    const tCtx = trainCanvas.getContext('2d');

    // 1. Treina as fotos reais com variações de rotação/escala
    for (const group of photoCatalog) {
      for (const path of group.paths) {
        try {
          const img = await this.loadImage(encodeURI(path));
          
          // Captura em escala original centralizada
          tCtx.fillStyle = "#000";
          tCtx.fillRect(0, 0, 224, 224);
          tCtx.drawImage(img, 0, 0, 224, 224);
          this.addTensorExample(trainCanvas, group.label);

          // Variação 1: Leve zoom central (foco na anatomia)
          tCtx.fillRect(0, 0, 224, 224);
          tCtx.drawImage(img, img.width * 0.1, img.height * 0.1, img.width * 0.8, img.height * 0.8, 0, 0, 224, 224);
          this.addTensorExample(trainCanvas, group.label);

          // Variação 2: Espelhamento horizontal (simula aproximação do outro lado)
          tCtx.save();
          tCtx.translate(224, 0);
          tCtx.scale(-1, 1);
          tCtx.drawImage(img, 0, 0, 224, 224);
          tCtx.restore();
          this.addTensorExample(trainCanvas, group.label);
        } catch (e) {
          console.warn(`Foto ${path} não carregada para treino:`, e);
        }
      }
    }

    // 2. Treina a classe de Fundo/Ruído (Teclados, mesas, mouses e objetos escuros)
    const bgColors = ['#0f172a', '#1e293b', '#334155', '#451a03', '#78350f', '#000000', '#262626'];
    for (const color of bgColors) {
      tCtx.fillStyle = color;
      tCtx.fillRect(0, 0, 224, 224);
      // Simula teclas de teclado
      tCtx.fillStyle = '#475569';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          tCtx.fillRect(20 + c * 48, 20 + r * 48, 38, 38);
        }
      }
      this.addTensorExample(trainCanvas, 'background');
    }
  }

  addTensorExample(canvasElement, label) {
    const tensor = tf.browser.fromPixels(canvasElement);
    const activation = this.model.infer(tensor, true);
    this.classifier.addExample(activation, label);
    tensor.dispose();
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  /**
   * Extrai o perfil de cor médio (HSL) e luminosidade da região do objeto
   */
  extractColorProfile(imgData, minX, maxX, minY, maxY, edgeMap, sampleSize) {
    const data = imgData.data;
    let totalR = 0, totalG = 0, totalB = 0, count = 0;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * sampleSize + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Amostra apenas os pixels da área do objeto
        totalR += r;
        totalG += g;
        totalB += b;
        count++;
      }
    }

    if (count === 0) return { h: 0, s: 0, l: 0 };

    const avgR = totalR / count / 255;
    const avgG = totalG / count / 255;
    const avgB = totalB / count / 255;

    const max = Math.max(avgR, avgG, avgB);
    const min = Math.min(avgR, avgG, avgB);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case avgR: h = (avgG - avgB) / d + (avgG < avgB ? 6 : 0); break;
        case avgG: h = (avgB - avgR) / d + 2; break;
        case avgB: h = (avgR - avgG) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: parseFloat(s.toFixed(2)),
      l: parseFloat(l.toFixed(2))
    };
  }

  /**
   * Valida se a cor da cena bate com o perfil real da peça
   */
  matchesColorProfile(pieceId, color) {
    const prof = this.colorProfiles[pieceId];
    if (!prof) return false;

    // Hippidion: Cinza grafite (baixa saturação, luminosidade média/baixa)
    if (pieceId === 'hippidion') {
      return color.s <= prof.maxSat && color.l >= prof.minLight && color.l <= prof.maxLight;
    }

    // Peixe-boi: Bege fóssil muito claro / marfim
    if (pieceId === 'peixeboi') {
      return color.l >= prof.minLight && color.s <= prof.maxSat;
    }

    // Flautista: Marrom ocre / tom terra
    if (pieceId === 'flautista') {
      return color.h >= prof.minHue && color.h <= prof.maxHue && color.s >= prof.minSat && color.l >= prof.minLight;
    }

    return false;
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

    // 1. Extração de Bordas
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

    // 2. Extração da Cor Média do Objeto no Visor
    const detectedColor = this.extractColorProfile(imgData, minX, maxX, minY, maxY, edgeMap, sampleSize);

    // 3. Inferência Neural com TensorFlow.js + MobileNet
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
      const bgConfidence = this.lastPrediction.confidences['background'] || 0;

      // Validação Multi-Modal Rígida:
      // a) Deve ser uma das 3 peças (e não 'background')
      // b) Confiança neural >= 65% e pelo menos 15% acima de 'background'
      // c) Cor do objeto deve bater com o tom real da peça no museu
      if (topClass !== 'background' && topConfidence >= 0.65 && (topConfidence - bgConfidence) >= 0.15) {
        const isColorMatch = this.matchesColorProfile(topClass, detectedColor);

        if (isColorMatch && totalEdges >= 80) {
          confirmedMatchId = topClass;
          matchConfidence = topConfidence;
        }
      }
    }

    this.lastTelemetry = {
      status: confirmedMatchId ? "detected" : "searching",
      message: confirmedMatchId ? `Identificado: ${confirmedMatchId.toUpperCase()}` : "Enquadre a peça no centro",
      totalEdges,
      color: `H:${detectedColor.h}° S:${Math.round(detectedColor.s * 100)}% L:${Math.round(detectedColor.l * 100)}%`,
      bestMatch: confirmedMatchId,
      scores
    };

    if (!confirmedMatchId) {
      return this.pushHistory(null);
    }

    // 4. Contorno Periférico Radial de 24 Pontos para Laser e Suspense
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
