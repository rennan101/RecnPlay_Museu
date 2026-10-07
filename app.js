/**
 * Controlador Principal do WebAR Museu
 */

class MuseumARApp {
  constructor() {
    this.video = document.getElementById('video');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.ctx = this.overlayCanvas.getContext('2d');
    this.hudViewfinder = document.getElementById('hud-viewfinder');
    this.hudStatus = document.getElementById('hud-status');
    this.cardContainer = document.getElementById('floating-card-container');
    this.audioBtn = document.getElementById('audio-play-btn');
    this.diagBtn = document.getElementById('diag-btn');
    this.diagPanel = document.getElementById('diag-panel');
    this.isDiagVisible = false;
    
    this.recognizer = new ShapeRecognizer();
    this.currentItemId = null;
    this.isAudioPlaying = false;
    this.synth = window.speechSynthesis;
    this.activeUtterance = null;
    this.lastDetectionTime = 0;
    this.detectionTimeout = 2800; // Tempo em ms para manter o card visível
    this.currentBBox = null;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.currentFps = 0;
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.recognizer.init();
    await this.startCamera();
    this.startProcessingLoop();
  }

  setupEventListeners() {
    // Painel de Diagnóstico
    if (this.diagBtn && this.diagPanel) {
      this.diagBtn.addEventListener('click', () => {
        this.isDiagVisible = !this.isDiagVisible;
        this.diagPanel.classList.toggle('visible', this.isDiagVisible);
        this.diagBtn.classList.toggle('active', this.isDiagVisible);
      });
    }

    // Botão de Áudio / Leitura em Voz Alta
    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => {
        this.toggleSpeech();
      });
    }

    // Modal de Ajuda
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');

    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    }
    if (closeHelp && helpModal) {
      closeHelp.addEventListener('click', () => helpModal.classList.remove('active'));
    }

    // Botão de troca/reinício de câmera
    const flipBtn = document.getElementById('flip-camera-btn');
    if (flipBtn) {
      flipBtn.addEventListener('click', () => {
        this.startCamera();
      });
    }

    // Ajuste responsivo de Canvas
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.overlayCanvas) {
      this.overlayCanvas.width = window.innerWidth;
      this.overlayCanvas.height = window.innerHeight;
    }
  }

  async startCamera() {
    this.resizeCanvas();
    const constraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await this.video.play();
      this.hudStatus.textContent = "Aponte a câmera para uma peça 3D";
    } catch (err) {
      console.warn("Erro ao acessar câmera traseira:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.video.srcObject = stream;
        await this.video.play();
        this.hudStatus.textContent = "Aponte a câmera para uma peça 3D";
      } catch (fallbackErr) {
        this.hudStatus.textContent = "Permissão de câmera necessária.";
      }
    }
  }

  startProcessingLoop() {
    const loop = () => {
      // Cálculo de FPS
      this.frameCount++;
      const nowPerf = performance.now();
      if (nowPerf - this.lastFpsTime >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / (nowPerf - this.lastFpsTime));
        this.frameCount = 0;
        this.lastFpsTime = nowPerf;
        const fpsEl = document.getElementById('diag-fps');
        if (fpsEl) fpsEl.textContent = `${this.currentFps} FPS`;
      }

      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        const detection = this.recognizer.processFrame(this.video);
        const now = Date.now();

        if (this.isDiagVisible) {
          this.updateDiagTelemetry();
        }

        if (detection && detection.id) {
          this.lastDetectionTime = now;
          this.currentBBox = detection.bbox;
          this.currentContour = detection.contour;
          this.showCard(detection.id, detection.bbox);
          this.hudViewfinder.classList.add('detected');
          this.drawTargetHUD(true, detection.bbox, detection.contour);
        } else {
          if (now - this.lastDetectionTime > this.detectionTimeout) {
            this.hideCard();
            this.hudViewfinder.classList.remove('detected');
            this.drawTargetHUD(false);
          } else if (this.currentBBox) {
            this.drawTargetHUD(true, this.currentBBox, this.currentContour);
          }
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateDiagTelemetry() {
    const telemetry = this.recognizer.getTelemetry();
    if (!telemetry) return;

    const statusEl = document.getElementById('diag-status');
    const edgesEl = document.getElementById('diag-edges');
    if (statusEl) statusEl.textContent = telemetry.message;
    if (edgesEl) edgesEl.textContent = telemetry.totalEdges;

    if (telemetry.scores) {
      for (const [id, sc] of Object.entries(telemetry.scores)) {
        const barEl = document.getElementById(`score-${id}`);
        const valEl = document.getElementById(`val-${id}`);
        if (barEl) barEl.style.width = `${sc.confidence}%`;
        if (valEl) valEl.textContent = `${sc.confidence}%`;
      }
    }

    if (telemetry.metrics) {
      document.getElementById('m-aspect').textContent = telemetry.metrics.aspectRatio;
      document.getElementById('m-density').textContent = telemetry.metrics.edgeDensity;
      document.getElementById('m-top').textContent = telemetry.metrics.topHeavy;
      document.getElementById('m-sym').textContent = telemetry.metrics.symmetry;
    }
  }

  drawTargetHUD(isDetected, bbox, contour) {
    this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    if (!isDetected) return;

    const screenW = this.overlayCanvas.width;
    const screenH = this.overlayCanvas.height;

    // Dimensões do visor central na tela
    const sDim = Math.min(screenW, screenH) * 0.7;
    const originX = (screenW - sDim) / 2;
    const originY = (screenH - sDim) / 2;

    const cx = screenW / 2;
    const cy = screenH / 2;

    this.ctx.save();

    // 1. DESENHO DO CONTORNO GROSSO E BRANCO AO REDOR DO OBJETO REAL
    if (contour && contour.length > 2) {
      this.ctx.beginPath();
      const firstX = originX + contour[0].x * sDim;
      const firstY = originY + contour[0].y * sDim;
      this.ctx.moveTo(firstX, firstY);

      for (let i = 1; i < contour.length; i++) {
        const ptX = originX + contour[i].x * sDim;
        const ptY = originY + contour[i].y * sDim;
        this.ctx.lineTo(ptX, ptY);
      }
      this.ctx.closePath();

      // Configuração do Contorno Grosso e Branco com Brilho
      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 7;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
      this.ctx.shadowBlur = 14;
      this.ctx.stroke();

      // Preenchimento sutil translúcido para destacar o objeto
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      this.ctx.fill();
    }

    // 2. LINHA DE CONEXÃO AR ENTRE O CONTORNO BRANCO E O CARD DE TEXTO
    if (this.cardContainer.classList.contains('visible')) {
      const cardRect = this.cardContainer.getBoundingClientRect();
      const targetAnchorX = (cardRect.left + cardRect.width / 2 < cx) ? cardRect.right : cardRect.left;
      const targetAnchorY = cardRect.top + cardRect.height / 2;

      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
      this.ctx.shadowBlur = 8;
      
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(targetAnchorX, targetAnchorY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  showCard(itemId, bbox) {
    const data = MUSEUM_ITEMS[itemId];
    if (!data) return;

    // Posiciona o card espacialmente ao lado do objeto na Realidade Aumentada
    this.positionCardSpatial(bbox);

    if (this.currentItemId === itemId && this.cardContainer.classList.contains('visible')) {
      return;
    }

    this.currentItemId = itemId;

    // Preenche o Card
    document.getElementById('card-badge').textContent = data.category;
    document.getElementById('card-badge').style.borderColor = data.badgeColor;
    document.getElementById('card-badge').style.color = data.badgeColor;
    
    document.getElementById('card-title').textContent = data.title;
    document.getElementById('card-subtitle').textContent = data.subtitle;
    document.getElementById('card-description').innerText = data.fullText;

    // Fatos Rápidos
    const factsContainer = document.getElementById('card-facts');
    factsContainer.innerHTML = '';
    data.facts.forEach(fact => {
      const item = document.createElement('div');
      item.className = 'fact-item';
      item.innerHTML = `
        <div class="fact-label">${fact.label}</div>
        <div class="fact-value">${fact.value}</div>
      `;
      factsContainer.appendChild(item);
    });

    this.cardContainer.classList.add('visible');
    this.hudStatus.textContent = `Identificado: ${data.title}`;

    if (this.isAudioPlaying) {
      this.stopSpeech();
    }
  }

  positionCardSpatial(bbox) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const cardW = Math.min(screenW * 0.88, 380);

    // Se a tela for ampla (Desktop/Tablet/Landscape), coloca ao lado direito ou esquerdo
    if (screenW > 768) {
      const left = Math.min(screenW - cardW - 24, (screenW / 2) + 140);
      const top = Math.max(80, (screenH / 2) - 180);
      this.cardContainer.style.left = `${left}px`;
      this.cardContainer.style.top = `${top}px`;
      this.cardContainer.style.right = 'auto';
      this.cardContainer.style.bottom = 'auto';
    } else {
      // Em smartphones retrato, ancora logo abaixo do visor central da peça
      const top = Math.min(screenH - 280, (screenH / 2) + (Math.min(screenW, screenH) * 0.38) + 10);
      const left = (screenW - cardW) / 2;
      this.cardContainer.style.left = `${left}px`;
      this.cardContainer.style.top = `${top}px`;
      this.cardContainer.style.right = 'auto';
      this.cardContainer.style.bottom = 'auto';
    }
  }

  hideCard() {
    this.cardContainer.classList.remove('visible');
    this.currentItemId = null;
    this.hudStatus.textContent = "Aponte a câmera para uma peça";
    if (this.isAudioPlaying) {
      this.stopSpeech();
    }
  }

  toggleSpeech() {
    if (this.isAudioPlaying) {
      this.stopSpeech();
    } else {
      this.playSpeech();
    }
  }

  playSpeech() {
    if (!this.currentItemId || !MUSEUM_ITEMS[this.currentItemId] || !('speechSynthesis' in window)) {
      return;
    }

    this.stopSpeech();

    const data = MUSEUM_ITEMS[this.currentItemId];
    this.activeUtterance = new SpeechSynthesisUtterance(data.audioText || data.fullText);
    this.activeUtterance.lang = 'pt-BR';
    this.activeUtterance.rate = 1.0;

    this.activeUtterance.onstart = () => {
      this.isAudioPlaying = true;
      this.audioBtn.classList.add('playing');
    };

    this.activeUtterance.onend = () => {
      this.isAudioPlaying = false;
      this.audioBtn.classList.remove('playing');
    };

    this.activeUtterance.onerror = () => {
      this.isAudioPlaying = false;
      this.audioBtn.classList.remove('playing');
    };

    this.synth.speak(this.activeUtterance);
  }

  stopSpeech() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    this.isAudioPlaying = false;
    if (this.audioBtn) {
      this.audioBtn.classList.remove('playing');
    }
  }
}

// Inicializa a aplicação assim que o DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  window.museumApp = new MuseumARApp();
});
