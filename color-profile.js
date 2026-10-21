/**
 * Validador Cromático Multi-Modal (HSL) baseado nas fotos oficiais do acervo
 * Calibrado empiricamente com as condições de iluminação e materiais das peças físicas.
 */

const MUSEUM_COLOR_PROFILES = {
  flautista: {
    name: "Flautista",
    minHue: 24,
    maxHue: 48,
    minSat: 0.06,
    maxSat: 0.35,
    minLight: 0.28,
    maxLight: 0.58
  },
  peixeboi: {
    name: "Peixe-boi",
    minHue: 38,
    maxHue: 65,
    minSat: 0.03,
    maxSat: 0.22,
    minLight: 0.42,
    maxLight: 0.70
  },
  hippidion: {
    name: "Hippidion",
    minHue: 0,
    maxHue: 360,
    minSat: 0.00,
    maxSat: 0.15,
    minLight: 0.45,
    maxLight: 0.75
  }
};

class ColorProfileValidator {
  constructor(profiles = MUSEUM_COLOR_PROFILES) {
    this.profiles = profiles;
  }

  /**
   * Extrai a cor média em formato HSL a partir da ROI do objeto
   */
  extract(imgData, minX, maxX, minY, maxY, sampleSize) {
    const data = imgData.data;
    let totalR = 0, totalG = 0, totalB = 0, count = 0;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * sampleSize + x) * 4;
        totalR += data[idx];
        totalG += data[idx + 1];
        totalB += data[idx + 2];
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
   * Valida se a cor extraída é plausível para o artefato especificado.
   * O Hippidion possui tom acromático/neutro (cinza fóssil), portanto a saturação
   * é o fator discriminante crítico contra artefatos coloridos estranhos.
   */
  matches(pieceId, color) {
    const prof = this.profiles[pieceId];
    if (!prof) return false;

    if (pieceId === 'hippidion') {
      return color.s <= prof.maxSat &&
             color.l >= prof.minLight &&
             color.l <= prof.maxLight;
    }

    if (pieceId === 'peixeboi') {
      return color.h >= prof.minHue &&
             color.h <= prof.maxHue &&
             color.s <= prof.maxSat &&
             color.l >= prof.minLight &&
             color.l <= prof.maxLight;
    }

    if (pieceId === 'flautista') {
      return color.h >= prof.minHue &&
             color.h <= prof.maxHue &&
             color.s >= prof.minSat &&
             color.s <= prof.maxSat &&
             color.l >= prof.minLight &&
             color.l <= prof.maxLight;
    }

    return false;
  }
}

window.ColorProfileValidator = ColorProfileValidator;
window.MUSEUM_COLOR_PROFILES = MUSEUM_COLOR_PROFILES;
