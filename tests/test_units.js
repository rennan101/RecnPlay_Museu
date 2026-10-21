const assert = require('assert');

// Mock window
global.window = {};

// Load modules
require('../color-profile.js');
require('../feature-extractor.js');

const ColorProfileValidator = global.window.ColorProfileValidator;
const FeatureExtractor = global.window.FeatureExtractor;

console.log('==> Testando ColorProfileValidator...');
const validator = new ColorProfileValidator();

// Test 1: Flautista (Brown / Ochre fossil)
assert.strictEqual(validator.matches('flautista', { h: 36, s: 0.12, l: 0.38 }), true, 'Flautista sample should match');
assert.strictEqual(validator.matches('flautista', { h: 180, s: 0.8, l: 0.5 }), false, 'Cyan should not match flautista');

// Test 2: Peixe-boi (Beige / Ivory fossil)
assert.strictEqual(validator.matches('peixeboi', { h: 50, s: 0.08, l: 0.55 }), true, 'Peixe-boi sample should match');
assert.strictEqual(validator.matches('peixeboi', { h: 0, s: 0.9, l: 0.5 }), false, 'Red should not match peixeboi');

// Test 3: Hippidion (Neutral gray / Graphite fossil)
assert.strictEqual(validator.matches('hippidion', { h: 48, s: 0.04, l: 0.62 }), true, 'Hippidion sample should match');
assert.strictEqual(validator.matches('hippidion', { h: 48, s: 0.45, l: 0.62 }), false, 'High saturation should fail hippidion');

console.log('✓ ColorProfileValidator: Todos os testes passaram!');

console.log('==> Testando FeatureExtractor...');
const extractor = new FeatureExtractor();

// Create 16x16 dummy image data with a sharp vertical line in the middle
const sampleSize = 16;
const data = new Uint8ClampedArray(sampleSize * sampleSize * 4);
for (let y = 0; y < sampleSize; y++) {
  for (let x = 0; x < sampleSize; x++) {
    const idx = (y * sampleSize + x) * 4;
    const val = (x >= 6 && x <= 10) ? 255 : 0;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }
}

const edges = extractor.extractEdges(data, sampleSize);
assert(edges.totalEdges > 0, 'Edges must be detected around gradient boundary');
assert(edges.minX <= 6 && edges.maxX >= 10, 'BBox must encompass vertical band');

const contour = extractor.computeRadialContour(
  edges.edgeMap,
  edges.minX,
  edges.maxX,
  edges.minY,
  edges.maxY,
  edges.objWidth,
  edges.objHeight,
  sampleSize
);
assert.strictEqual(contour.length, 24, 'Contour must have 24 radial points');

console.log('✓ FeatureExtractor: Todos os testes passaram!');
