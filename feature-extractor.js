/**
 * Extrator Espacial de Bordas e Contorno Geométrico
 * Utiliza operador Sobel 3x3 para segmentação e traçado radial de 24 pontos
 * para renderizar a mira laser HUD sobre o relevo das peças 3D.
 */

class FeatureExtractor {
  constructor(options = {}) {
    this.sobelThreshold = options.sobelThreshold || 0.14;
    this.numContourRays = options.numContourRays || 24;
  }

  /**
   * Converte a região amostrada em tons de cinza e computa magnitude de gradiente Sobel.
   * Retorna mapa binário de bordas, contagem total e bounding box delimitadora.
   */
  extractEdges(data, sampleSize) {
    const gray = new Float32Array(sampleSize * sampleSize);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
    }

    let totalEdges = 0;
    let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;
    const edgeMap = new Uint8Array(sampleSize * sampleSize);

    for (let y = 1; y < sampleSize - 1; y++) {
      const yOffset = y * sampleSize;
      const prevRow = yOffset - sampleSize;
      const nextRow = yOffset + sampleSize;

      for (let x = 1; x < sampleSize - 1; x++) {
        // Convolução Sobel Horizontal (Gx)
        const gx = -gray[prevRow + x - 1] + gray[prevRow + x + 1]
                   -2 * gray[yOffset + x - 1] + 2 * gray[yOffset + x + 1]
                   -gray[nextRow + x - 1] + gray[nextRow + x + 1];

        // Convolução Sobel Vertical (Gy)
        const gy = -gray[prevRow + x - 1] - 2 * gray[prevRow + x] - gray[prevRow + x + 1]
                   +gray[nextRow + x - 1] + 2 * gray[nextRow + x] + gray[nextRow + x + 1];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > this.sobelThreshold) {
          edgeMap[yOffset + x] = 1;
          totalEdges++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Caso não encontre bordas suficientes, centraliza bbox padrão
    if (minX > maxX) {
      minX = sampleSize * 0.25;
      maxX = sampleSize * 0.75;
      minY = sampleSize * 0.25;
      maxY = sampleSize * 0.75;
    }

    const objWidth = Math.max(1, maxX - minX);
    const objHeight = Math.max(1, maxY - minY);

    return {
      edgeMap,
      totalEdges,
      minX,
      maxX,
      minY,
      maxY,
      objWidth,
      objHeight
    };
  }

  /**
   * Traça 24 raios angulares a partir do centroide do objeto até a borda externa
   * gerando polígono suave para o contorno laser do HUD.
   */
  computeRadialContour(edgeMap, minX, maxX, minY, maxY, objWidth, objHeight, sampleSize) {
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const contourPoints = [];
    const maxDist = Math.max(objWidth, objHeight) * 0.56;

    for (let i = 0; i < this.numContourRays; i++) {
      const angle = (i / this.numContourRays) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      let foundX = centerX + cosA * maxDist;
      let foundY = centerY + sinA * maxDist;

      // Amostra do exterior em direção ao centro para capturar a primeira borda
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

    return contourPoints;
  }
}

window.FeatureExtractor = FeatureExtractor;
