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
    
    // Scanner Holográfico HUD
    this.hudScanOverlay = document.getElementById('hud-scan-overlay');
    this.hudScanTag = document.getElementById('hud-scan-tag');
    this.hudScanPercentage = document.getElementById('hud-scan-percentage');
    this.isScanningActive = false;
    this.scanningTargetId = null;
    this.scanStartTime = 0;
    this.scanDuration = 1200; // 1.2 segundos de animação imersiva de varredura
    this.lastDetectionSeenTime = 0;

    // Efeito de Suspense (Objeto 100% Branco e Brilhante)
    this.isSuspenseActive = false;
    this.suspenseStartTime = 0;
    this.suspenseDuration = 800; // 0.8s de suspense luminoso antes de abrir os detalhes
    this.suspenseTargetId = null;
    this.lastContour = null;
    
    // Modal em Tela Cheia
    this.objectModal = document.getElementById('object-fullscreen-modal');
    this.closeObjectModalBtn = document.getElementById('close-object-modal');
    this.backToCameraBtn = document.getElementById('back-to-camera-btn');
    
    // Player de Áudio
    this.audioPlayerCard = document.querySelector('.audio-player-card');
    this.audioBtn = document.getElementById('audio-play-btn');
    this.audioPlayIcon = document.getElementById('audio-icon-play');
    this.audioPauseIcon = document.getElementById('audio-icon-pause');
    this.audioBtnLabel = document.getElementById('audio-btn-label');
    this.audioBtnStatus = document.getElementById('audio-btn-status');
    this.audioSoundWave = document.getElementById('audio-sound-wave');
    this.audioProgressBar = document.getElementById('audio-progress-bar');
    this.audioCurrentTimeEl = document.getElementById('audio-current-time');
    this.audioTotalTimeEl = document.getElementById('audio-total-time');
    
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
    this.isUserSeeking = false;
    
    // Métricas de FPS
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

    // Controles do Player de Áudio
    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => {
        this.toggleAudio();
      });
    }

    if (this.audioProgressBar) {
      this.audioProgressBar.addEventListener('input', (e) => {
        this.isUserSeeking = true;
        if (this.currentAudio && this.currentAudio.duration) {
          const targetTime = (parseFloat(e.target.value) / 100) * this.currentAudio.duration;
          this.audioCurrentTimeEl.textContent = this.formatTime(targetTime);
        }
      });

      this.audioProgressBar.addEventListener('change', (e) => {
        if (this.currentAudio && this.currentAudio.duration) {
          this.currentAudio.currentTime = (parseFloat(e.target.value) / 100) * this.currentAudio.duration;
        }
        this.isUserSeeking = false;
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

      // Se o modal estiver aberto, pausamos o processamento para economizar CPU
      if (this.isObjectModalOpen) {
        requestAnimationFrame(loop);
        return;
      }

      const now = Date.now();

      // FASE DE SUSPENSE ATIVA (Objeto brilhando em branco puro)
      if (this.isSuspenseActive) {
        const suspenseElapsed = now - this.suspenseStartTime;
        this.drawSuspenseHUD(this.lastContour);

        if (suspenseElapsed >= this.suspenseDuration) {
          this.isSuspenseActive = false;
          this.hudViewfinder.classList.remove('suspense');
          this.hudViewfinder.classList.remove('scanning');
          this.showObjectModal(this.suspenseTargetId);
        }
        requestAnimationFrame(loop);
        return;
      }

      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        const detection = this.recognizer.processFrame(this.video);

        if (this.isDiagVisible) {
          this.updateDiagTelemetry();
        }

        // Se houver detecção confirmada e não estivermos em cooldown pós-fechamento
        if (detection && detection.id && now > this.detectionCooldown) {
          this.lastDetectionSeenTime = now;
          this.lastContour = detection.contour;
          const targetId = detection.id;

          // Inicia ou continua a animação de varredura/escaneamento
          if (!this.isScanningActive || this.scanningTargetId !== targetId) {
            this.isScanningActive = true;
            this.scanningTargetId = targetId;
            this.scanStartTime = now;
            this.hudViewfinder.classList.remove('suspense');
            this.hudViewfinder.classList.add('scanning');
            if (this.hudScanTag) this.hudScanTag.textContent = "ESCANEANDO PEÇA";
          }

          const elapsed = now - this.scanStartTime;
          const progress = Math.min(1.0, elapsed / this.scanDuration);
          const percentage = Math.floor(progress * 100);

          if (this.hudScanPercentage) {
            this.hudScanPercentage.textContent = `${percentage}%`;
          }

          const targetName = MUSEUM_ITEMS[targetId] ? MUSEUM_ITEMS[targetId].title : 'Peça';
          this.hudStatus.textContent = `Escaneando ${targetName} (${percentage}%)`;

          // Desenha a varredura holográfica no canvas
          this.drawScanningHUD(detection.bbox, detection.contour, progress);

          // Quando a animação de escaneamento atinge 100%, inicia a FASE DE SUSPENSE BRANCA!
          if (progress >= 1.0) {
            this.isScanningActive = false;
            this.isSuspenseActive = true;
            this.suspenseStartTime = now;
            this.suspenseTargetId = targetId;
            
            this.hudViewfinder.classList.remove('scanning');
            this.hudViewfinder.classList.add('suspense');
            if (this.hudScanTag) this.hudScanTag.textContent = "✓ 100% IDENTIFICADO";
            if (this.hudScanPercentage) this.hudScanPercentage.textContent = "100%";
            this.hudStatus.textContent = `✓ ${targetName} Identificado!`;
          }
        } else {
          // Se perder a detecção por mais de 500ms durante o scan, cancela o scan
          if (this.isScanningActive && now - this.lastDetectionSeenTime > 500) {
            this.isScanningActive = false;
            this.scanningTargetId = null;
            this.hudViewfinder.classList.remove('scanning');
            this.hudViewfinder.classList.remove('suspense');
            this.hudStatus.textContent = "Aponte a câmera para uma peça 3D";
          }

          if (!this.isScanningActive && !this.isSuspenseActive) {
            this.hudViewfinder.classList.remove('detected');
            this.drawTargetHUD(false);
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
  }

  drawTargetHUD(isDetected) {
    if (!this.ctx || !this.overlayCanvas) return;
    this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  drawScanningHUD(bbox, contour, progress) {
    if (!this.ctx || !this.overlayCanvas) return;
    this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const screenW = this.overlayCanvas.width;
    const screenH = this.overlayCanvas.height;

    // Dimensões do visor central na tela
    const sDim = Math.min(screenW, screenH) * 0.7;
    const originX = (screenW - sDim) / 2;
    const originY = (screenH - sDim) / 2;

    this.ctx.save();

    // 1. Desenho do Contorno do Objeto em Varredura
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

      // Contorno esmeralda com brilho holográfico
      this.ctx.strokeStyle = "#10b981";
      this.ctx.lineWidth = 5;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.shadowColor = "rgba(16, 185, 129, 0.95)";
      this.ctx.shadowBlur = 16;
      this.ctx.stroke();

      // Preenchimento holográfico proporcional ao progresso
      const alpha = 0.06 + progress * 0.16;
      this.ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
      this.ctx.fill();

      // Vértices do Contorno (Nós de Scanner)
      for (let i = 0; i < contour.length; i += 3) {
        const ptX = originX + contour[i].x * sDim;
        const ptY = originY + contour[i].y * sDim;
        this.ctx.beginPath();
        this.ctx.arc(ptX, ptY, 3.5, 0, Math.PI * 2);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.shadowColor = "#10b981";
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
      }

      // 2. Linha de Laser de Varredura Vertical
      const laserY = originY + progress * sDim;
      this.ctx.beginPath();
      this.ctx.moveTo(originX - 10, laserY);
      this.ctx.lineTo(originX + sDim + 10, laserY);
      this.ctx.strokeStyle = "#6ee7b7";
      this.ctx.lineWidth = 3.5;
      this.ctx.shadowColor = "#10b981";
      this.ctx.shadowBlur = 14;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * Efeito de Suspense: Desenha o objeto totalmente branco e brilhando intensamente
   */
  drawSuspenseHUD(contour) {
    if (!this.ctx || !this.overlayCanvas) return;
    this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const screenW = this.overlayCanvas.width;
    const screenH = this.overlayCanvas.height;
    const sDim = Math.min(screenW, screenH) * 0.7;
    const originX = (screenW - sDim) / 2;
    const originY = (screenH - sDim) / 2;

    this.ctx.save();

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

      // Preenchimento branco puro e brilhante cobrindo todo o modelo 3D
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
      this.ctx.shadowColor = "#FFFFFF";
      this.ctx.shadowBlur = 45;
      this.ctx.fill();

      // Contorno branco espesso com efeito de bloom radiante
      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.stroke();

      // Pontos de luz nos vértices
      for (let i = 0; i < contour.length; i += 2) {
        const ptX = originX + contour[i].x * sDim;
        const ptY = originY + contour[i].y * sDim;
        this.ctx.beginPath();
        this.ctx.arc(ptX, ptY, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.shadowColor = "#FFFFFF";
        this.ctx.shadowBlur = 20;
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  showObjectModal(itemId) {
    const data = MUSEUM_ITEMS[itemId];
    if (!data) return;

    this.currentItemId = itemId;
    this.isObjectModalOpen = true;

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

    // Carrega o arquivo de áudio MP3 original da peça
    this.loadAudioForCurrentItem();

    // Abre o modal em tela cheia com animação
    if (this.objectModal) {
      this.objectModal.classList.add('active');
    }

    this.hudStatus.textContent = `Identificado: ${data.title}`;
  }

  closeObjectModal() {
    this.isObjectModalOpen = false;
    this.detectionCooldown = Date.now() + 1800; // 1.8 segundos de pausa antes de re-escanear
    this.isScanningActive = false;
    this.isSuspenseActive = false;
    this.scanningTargetId = null;
    this.suspenseTargetId = null;

    this.stopAudio();

    if (this.objectModal) {
      this.objectModal.classList.remove('active');
    }

    this.hudStatus.textContent = "Aponte a câmera para uma peça 3D";
    if (this.hudViewfinder) {
      this.hudViewfinder.classList.remove('detected');
      this.hudViewfinder.classList.remove('scanning');
      this.hudViewfinder.classList.remove('suspense');
    }

    if (this.ctx && this.overlayCanvas) {
      this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  loadAudioForCurrentItem() {
    this.stopAudio();
    if (!this.currentItemId || !MUSEUM_ITEMS[this.currentItemId]) return;

    const data = MUSEUM_ITEMS[this.currentItemId];
    if (!data.audioUrl) return;

    this.currentAudio = new Audio(data.audioUrl);
    this.currentAudio.preload = "auto";

    this.currentAudio.addEventListener('loadedmetadata', () => {
      if (this.audioTotalTimeEl && this.currentAudio) {
        this.audioTotalTimeEl.textContent = this.formatTime(this.currentAudio.duration);
      }
    });

    this.currentAudio.addEventListener('timeupdate', () => {
      if (!this.isUserSeeking && this.currentAudio && this.currentAudio.duration) {
        const pct = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
        if (this.audioProgressBar) {
          this.audioProgressBar.value = pct;
        }
        if (this.audioCurrentTimeEl) {
          this.audioCurrentTimeEl.textContent = this.formatTime(this.currentAudio.currentTime);
        }
      }
    });

    this.currentAudio.addEventListener('ended', () => {
      this.resetAudioUI();
    });

    this.currentAudio.addEventListener('pause', () => {
      if (!this.currentAudio.ended) {
        this.setAudioPausedUI();
      }
    });

    this.currentAudio.addEventListener('play', () => {
      this.setAudioPlayingUI();
    });

    this.currentAudio.addEventListener('error', (e) => {
      console.warn("Erro ao carregar arquivo MP3 original:", e);
      if (this.audioBtnStatus) {
        this.audioBtnStatus.textContent = "Áudio indisponível no momento";
      }
      this.resetAudioUI();
    });

    this.resetAudioUI();
  }

  resetAudioUI() {
    this.isAudioPlaying = false;
    if (this.audioPlayerCard) this.audioPlayerCard.classList.remove('playing');
    if (this.audioPlayIcon) this.audioPlayIcon.style.display = 'block';
    if (this.audioPauseIcon) this.audioPauseIcon.style.display = 'none';
    if (this.audioBtnLabel) this.audioBtnLabel.textContent = 'Narração da Peça';
    if (this.audioBtnStatus) this.audioBtnStatus.textContent = 'Toque para ouvir a narração';
    if (this.audioProgressBar) this.audioProgressBar.value = 0;
    if (this.audioCurrentTimeEl) this.audioCurrentTimeEl.textContent = '0:00';
  }

  setAudioPausedUI() {
    this.isAudioPlaying = false;
    if (this.audioPlayerCard) this.audioPlayerCard.classList.remove('playing');
    if (this.audioPlayIcon) this.audioPlayIcon.style.display = 'block';
    if (this.audioPauseIcon) this.audioPauseIcon.style.display = 'none';
    if (this.audioBtnLabel) this.audioBtnLabel.textContent = 'Narração Pausada';
    if (this.audioBtnStatus) this.audioBtnStatus.textContent = 'Toque para continuar';
  }

  setAudioPlayingUI() {
    this.isAudioPlaying = true;
    if (this.audioPlayerCard) this.audioPlayerCard.classList.add('playing');
    if (this.audioPlayIcon) this.audioPlayIcon.style.display = 'none';
    if (this.audioPauseIcon) this.audioPauseIcon.style.display = 'block';
    if (this.audioBtnLabel) this.audioBtnLabel.textContent = 'Reproduzindo Áudio';
    if (this.audioBtnStatus) this.audioBtnStatus.textContent = 'Ouvindo narração oficial';
  }

  toggleAudio() {
    if (!this.currentAudio) {
      this.loadAudioForCurrentItem();
    }
    if (!this.currentAudio) return;

    if (this.isAudioPlaying) {
      this.currentAudio.pause();
    } else {
      this.currentAudio.play().catch(err => {
        console.warn("Reprodução de áudio bloqueada pelo navegador:", err);
      });
    }
  }

  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.resetAudioUI();
  }
}

// Inicializa a aplicação assim que o DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  window.museumApp = new MuseumARApp();
});
