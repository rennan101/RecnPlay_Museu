/**
 * Componente Modular de Tela de Carregamento (Loading Screen)
 * Exibe progresso da calibração neural e preparação do acervo
 */
class LoadingScreen {
  constructor(options = {}) {
    this.overlay = document.getElementById(options.overlayId || 'startup-loading-screen');
    this.barFill = document.getElementById(options.barFillId || 'loading-bar-fill');
    this.percentageText = document.getElementById(options.percentageId || 'loading-percentage');
    this.statusText = document.getElementById(options.statusId || 'loading-status-text');
    this.retryBtn = document.getElementById(options.retryBtnId || 'loading-retry-btn');
    this.currentProgress = 0;
  }

  update(progress, message) {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    if (clamped >= this.currentProgress) {
      this.currentProgress = clamped;
    }
    if (this.barFill) {
      this.barFill.style.width = `${this.currentProgress}%`;
    }
    if (this.percentageText) {
      this.percentageText.textContent = `${this.currentProgress}%`;
    }
    if (this.statusText && message) {
      this.statusText.textContent = message;
    }
  }

  showError(message, onRetry) {
    if (this.statusText) {
      this.statusText.textContent = message || 'Falha ao carregar componentes neurais.';
      this.statusText.classList.add('error');
    }
    if (this.retryBtn) {
      this.retryBtn.style.display = 'inline-flex';
      this.retryBtn.onclick = () => {
        this.retryBtn.style.display = 'none';
        if (this.statusText) this.statusText.classList.remove('error');
        if (typeof onRetry === 'function') onRetry();
      };
    }
  }

  complete(onDone) {
    this.update(100, 'Tudo pronto! Aponte para as peças.');
    setTimeout(() => {
      if (this.overlay) {
        this.overlay.classList.add('fade-out');
        setTimeout(() => {
          this.overlay.style.display = 'none';
          if (typeof onDone === 'function') onDone();
        }, 400);
      } else if (typeof onDone === 'function') {
        onDone();
      }
    }, 450);
  }
}

if (typeof window !== 'undefined') {
  window.LoadingScreen = LoadingScreen;
}
if (typeof module !== 'undefined') {
  module.exports = { LoadingScreen };
}

