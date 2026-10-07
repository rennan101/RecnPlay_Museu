/**
 * Controlador Principal do WebAR Museu
 */

class MuseumARApp {
  constructor() {
    this.video = document.getElementById('video');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.ctx = this.overlayCanvas ? this.overlayCanvas.getContext('2d') : null;
    this.hudViewfinder = document.getElementById('hud-viewfinder');
    this.hudStatus = document.getElementById('hud-status');
    
    // Modal em Tela Cheia
    this.objectModal = document.getElementById('object-fullscreen-modal');
    this.closeObjectModalBtn = document.getElementById('close-object-modal');
    this.backToCameraBtn = document.getElementById('back-to-camera-btn');
    
    // Player de Áudio
    this.audioBtn = document.getElementById('audio-play-btn');
    this.audioPlayIcon = document.getElementById('audio-icon-play');
    this.audioPauseIcon = document.getElementById('audio-icon-pause');
    this.audioBtnLabel = document.getElementById('audio-btn-label');
    this.audioBtnStatus = document.getElementById('audio-btn-status');
    this.audioSoundWave = document.getElementById('audio-sound-wave');
    
    // Diagnóstico
    this.diagBtn = document.getElementById('diag-btn');
    this.diagPanel = document.getElementById('diag-panel');
    this.isDiagVisible = false;
    
    // Reconhecimento
    this.recognizer = new ShapeRecognizer();
    this.currentItemId = null;
    this.isObjectModalOpen = false;
    this.detectionCooldown = 0;
    
    // Áudio
    this.isAudioPlaying = false;
    this.currentAudio = null;
    this.speechUtterance = null;
    
    // Métricas
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

    // Botão de Áudio
    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => {
        this.toggleAudio();
      });
    }

    // Fechamento do Modal em Tela Cheia
    if (this.closeObjectModalBtn) {
      this.closeObjectModalBtn.addEventListener('click', () => {
        this.closeObjectModal();
      });
    }

    if (this.backToCameraBtn) {
      this.backToCameraBtn.addEventListener('click', () => {
        this.closeObjectModal();
      });
    }

    // Fechar ao pressionar tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.isObjectModalOpen) {
          this.closeObjectModal();
        }
        const helpModal = document.getElementById('help-modal');
        if (helpModal && helpModal.classList.contains('active')) {
          helpModal.classList.remove('active');
        }
      }
    });

    // Modal de Créditos Institucionais
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');

    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    }
    if (closeHelp && helpModal) {
      closeHelp.addEventListener('click', () => helpModal.classList.remove('active'));
    }
    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          helpModal.classList.remove('active');
        }
      });
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

      // Se o modal estiver aberto em tela cheia, pausamos a detecção contínua para economizar CPU
      if (this.isObjectModalOpen) {
        requestAnimationFrame(loop);
        return;
      }

      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        const detection = this.recognizer.processFrame(this.video);
        const now = Date.now();

        if (this.isDiagVisible) {
          this.updateDiagTelemetry();
        }

        // Se houver detecção e não estivermos no período de cooldown após fechar
        if (detection && detection.id && now > this.detectionCooldown) {
          this.drawTargetHUD(true, detection.bbox, detection.contour);
          this.hudViewfinder.classList.add('detected');
          this.showObjectModal(detection.id, detection.bbox, detection.contour);
        } else {
          this.hudViewfinder.classList.remove('detected');
          this.drawTargetHUD(false);
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
      const elAspect = document.getElementById('m-aspect');
      const elDensity = document.getElementById('m-density');
      const elTop = document.getElementById('m-top');
      const elSym = document.getElementById('m-sym');
      if (elAspect) elAspect.textContent = telemetry.metrics.aspectRatio;
      if (elDensity) elDensity.textContent = telemetry.metrics.edgeDensity;
      if (elTop) elTop.textContent = telemetry.metrics.topHeavy;
      if (elSym) elSym.textContent = telemetry.metrics.symmetry;
    }
  }

  drawTargetHUD(isDetected, bbox, contour) {
    if (!this.ctx || !this.overlayCanvas) return;
    this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    if (!isDetected) return;

    const screenW = this.overlayCanvas.width;
    const screenH = this.overlayCanvas.height;

    // Dimensões do visor central na tela
    const sDim = Math.min(screenW, screenH) * 0.7;
    const originX = (screenW - sDim) / 2;
    const originY = (screenH - sDim) / 2;

    this.ctx.save();

    // Desenho do contorno branco ao redor do objeto
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

      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 6;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
      this.ctx.shadowBlur = 14;
      this.ctx.stroke();

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  showObjectModal(itemId, bbox, contour) {
    const data = MUSEUM_ITEMS[itemId];
    if (!data) return;

    this.currentItemId = itemId;
    this.isObjectModalOpen = true;

    // Preenche os dados no modal
    const badgeEl = document.getElementById('card-badge');
    if (badgeEl) {
      badgeEl.textContent = data.category;
      badgeEl.style.borderColor = data.badgeColor || '#06b6d4';
      badgeEl.style.color = data.badgeColor || '#06b6d4';
    }

    const titleEl = document.getElementById('card-title');
    if (titleEl) titleEl.textContent = data.title;

    const subtitleEl = document.getElementById('card-subtitle');
    if (subtitleEl) subtitleEl.textContent = data.subtitle;

    const descEl = document.getElementById('card-description');
    if (descEl) descEl.innerText = data.fullText;

    // Fatos Técnicos
    const factsContainer = document.getElementById('card-facts');
    if (factsContainer) {
      factsContainer.innerHTML = '';
      if (Array.isArray(data.facts)) {
        data.facts.forEach(fact => {
          const item = document.createElement('div');
          item.className = 'fact-item';
          item.innerHTML = `
            <div class="fact-label">${fact.label}</div>
            <div class="fact-value">${fact.value}</div>
          `;
          factsContainer.appendChild(item);
        });
      }
    }

    // Reseta estado do botão de áudio
    this.resetAudioUI();

    // Abre o modal em tela cheia
    if (this.objectModal) {
      this.objectModal.classList.add('active');
    }

    this.hudStatus.textContent = `Identificado: ${data.title}`;
  }

  closeObjectModal() {
    this.isObjectModalOpen = false;
    this.detectionCooldown = Date.now() + 1800; // 1.8 segundos de pausa antes de re-escanear

    this.stopAudio();

    if (this.objectModal) {
      this.objectModal.classList.remove('active');
    }

    this.hudStatus.textContent = "Aponte a câmera para uma peça 3D";
    if (this.hudViewfinder) {
      this.hudViewfinder.classList.remove('detected');
    }

    if (this.ctx && this.overlayCanvas) {
      this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  resetAudioUI() {
    this.isAudioPlaying = false;
    if (this.audioBtn) this.audioBtn.classList.remove('playing');
    if (this.audioPlayIcon) this.audioPlayIcon.style.display = 'block';
    if (this.audioPauseIcon) this.audioPauseIcon.style.display = 'none';
    if (this.audioBtnLabel) this.audioBtnLabel.textContent = 'Ouvir Narração da Peça';
    if (this.audioBtnStatus) this.audioBtnStatus.textContent = 'Clique para reproduzir o áudio explicativo';
  }

  setAudioPlayingUI() {
    this.isAudioPlaying = true;
    if (this.audioBtn) this.audioBtn.classList.add('playing');
    if (this.audioPlayIcon) this.audioPlayIcon.style.display = 'none';
    if (this.audioPauseIcon) this.audioPauseIcon.style.display = 'block';
    if (this.audioBtnLabel) this.audioBtnLabel.textContent = 'Pausar Narração';
    if (this.audioBtnStatus) this.audioBtnStatus.textContent = 'Reproduzindo áudio explicativo...';
  }

  toggleAudio() {
    if (this.isAudioPlaying) {
      this.stopAudio();
    } else {
      this.playAudio();
    }
  }

  playAudio() {
    if (!this.currentItemId || !MUSEUM_ITEMS[this.currentItemId]) {
      return;
    }

    this.stopAudio();
    const data = MUSEUM_ITEMS[this.currentItemId];

    this.setAudioPlayingUI();

    // 1. Tentativa de reprodução via arquivo de áudio
    if (data.audioUrl) {
      this.currentAudio = new Audio(data.audioUrl);

      this.currentAudio.onended = () => {
        this.resetAudioUI();
      };

      this.currentAudio.onerror = (e) => {
        console.warn("Erro ao reproduzir arquivo de áudio. Utilizando síntese de voz nativa...", e);
        this.fallbackSpeechSynthesis(data.fullText);
      };

      const playPromise = this.currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay bloqueado ou falha no arquivo. Utilizando síntese de voz nativa:", err);
          this.fallbackSpeechSynthesis(data.fullText);
        });
      }
    } else {
      this.fallbackSpeechSynthesis(data.fullText);
    }
  }

  fallbackSpeechSynthesis(text) {
    if (!('speechSynthesis' in window)) {
      this.resetAudioUI();
      return;
    }

    window.speechSynthesis.cancel();
    this.speechUtterance = new SpeechSynthesisUtterance(text);
    this.speechUtterance.lang = 'pt-BR';
    this.speechUtterance.rate = 1.0;
    this.speechUtterance.pitch = 1.0;

    this.speechUtterance.onend = () => {
      this.resetAudioUI();
    };

    this.speechUtterance.onerror = () => {
      this.resetAudioUI();
    };

    window.speechSynthesis.speak(this.speechUtterance);
  }

  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.speechUtterance = null;
    this.resetAudioUI();
  }
}

// Inicializa a aplicação assim que o DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  window.museumApp = new MuseumARApp();
});
