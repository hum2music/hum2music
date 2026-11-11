import type { PitchFrame } from "@hum2music/core";

export const DEFAULT_FRAME_SIZE = 1024;
export const DEFAULT_HOP_SIZE = 512;

export interface YinOptions {
  frameSize?: number;
  hopSize?: number;
  threshold?: number;
  minFrequencyHz?: number;
  maxFrequencyHz?: number;
}

/**
 * YIN pitch detection (de Cheveigne & Kawahara, 2002), evaluated per sliding
 * frame over the whole signal. Frames where no period passes the absolute
 * threshold are reported as unvoiced rather than forced to a guess.
 */
export function detectPitchYin(samples: Float32Array, sampleRate: number, options: YinOptions = {}): PitchFrame[] {
  const frameSize = options.frameSize ?? DEFAULT_FRAME_SIZE;
  const hopSize = options.hopSize ?? DEFAULT_HOP_SIZE;
  const threshold = options.threshold ?? 0.12;
  const minFrequencyHz = options.minFrequencyHz ?? 80;
  const maxFrequencyHz = options.maxFrequencyHz ?? 1000;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFrequencyHz));
  const tauMax = Math.min(Math.floor(frameSize / 2) - 1, Math.floor(sampleRate / minFrequencyHz));

  const frames: PitchFrame[] = [];
  const diff = new Float64Array(tauMax + 1);
  const cmndf = new Float64Array(tauMax + 1);

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      for (let j = 0; j < frameSize - tau; j++) {
        const delta = samples[start + j] - samples[start + j + tau];
        sum += delta * delta;
      }
      diff[tau] = sum;
    }

    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      runningSum += diff[tau];
      cmndf[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
    }

    let tauEstimate = -1;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (cmndf[tau] < threshold) {
        while (tau + 1 <= tauMax && cmndf[tau + 1] < cmndf[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    const timeMs = (start / sampleRate) * 1000;

    if (tauEstimate === -1) {
      frames.push({ timeMs, f0Hz: null, confidence: 0, voiced: false });
      continue;
    }

    const refinedTau = parabolicInterpolate(cmndf, tauEstimate, tauMax);
    const f0Hz = sampleRate / refinedTau;
    const confidence = Math.max(0, 1 - cmndf[tauEstimate]);

    frames.push({ timeMs, f0Hz, confidence, voiced: true });
  }

  return frames;
}

function parabolicInterpolate(cmndf: Float64Array, tau: number, tauMax: number): number {
  if (tau <= 0 || tau >= tauMax) return tau;
  const s0 = cmndf[tau - 1];
  const s1 = cmndf[tau];
  const s2 = cmndf[tau + 1];
  const denominator = s0 + s2 - 2 * s1;
  if (denominator === 0) return tau;
  return tau + (0.5 * (s0 - s2)) / denominator;
}
