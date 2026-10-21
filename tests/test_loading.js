const assert = require('assert');

// Mock DOM
const elements = {};
global.document = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        textContent: ''
      };
    }
    return elements[id];
  },
  createElement: () => ({ getContext: () => ({}) })
};

// Load LoadingScreen class
const { LoadingScreen } = require('../loading.js');

console.log('==> Testando LoadingScreen...');
const loader = new LoadingScreen();

// 1. Initial State
assert.strictEqual(loader.currentProgress, 0, 'Progresso inicial deve ser 0');

// 2. Progression & Clamp
loader.update(45, 'Baixando modelo...');
assert.strictEqual(loader.currentProgress, 45, 'Progresso deve ser 45');
assert.strictEqual(elements['loading-percentage'].textContent, '45%', 'Texto de percentual deve ser 45%');
assert.strictEqual(elements['loading-bar-fill'].style.width, '45%', 'Barra deve ter width 45%');
assert.strictEqual(elements['loading-status-text'].textContent, 'Baixando modelo...', 'Status text deve ser atualizado');

// 3. Monotonic Progress (never jumps backwards)
loader.update(30, 'Recuo ignorado');
assert.strictEqual(loader.currentProgress, 45, 'Progresso não deve retroceder');

// 4. Upper Bound Clamp
loader.update(120, 'Passou de 100');
assert.strictEqual(loader.currentProgress, 100, 'Progresso deve ser limitado a 100%');
assert.strictEqual(elements['loading-percentage'].textContent, '100%');

// 5. Error handling
loader.showError('Erro de conexão', () => {});
assert.strictEqual(elements['loading-status-text'].textContent, 'Erro de conexão');
assert.strictEqual(elements['loading-retry-btn'].style.display, 'inline-flex');

console.log('✓ LoadingScreen: Todos os testes passaram!');
