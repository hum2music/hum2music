export function generateTone(
  frequencyHz: number,
  durationSec: number,
  sampleRate = 44100,
  amplitude = 0.5,
): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate);
  }
  return samples;
}

export function generateVibratoTone(
  frequencyHz: number,
  durationSec: number,
  vibratoRateHz = 5.5,
  vibratoDepthCents = 25,
  sampleRate = 44100,
  amplitude = 0.5,
): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const vibratoCents = vibratoDepthCents * Math.sin(2 * Math.PI * vibratoRateHz * t);
    const instantaneousFrequency = frequencyHz * Math.pow(2, vibratoCents / 1200);
    phase += (2 * Math.PI * instantaneousFrequency) / sampleRate;
    samples[i] = amplitude * Math.sin(phase);
  }
  return samples;
}

export function generateSilence(durationSec: number, sampleRate = 44100): Float32Array {
  return new Float32Array(Math.floor(durationSec * sampleRate));
}

export function generateScale(
  frequenciesHz: number[],
  noteDurationSec = 0.3,
  gapSec = 0.08,
  sampleRate = 44100,
  amplitude = 0.5,
): Float32Array {
  const parts: Float32Array[] = [];
  frequenciesHz.forEach((frequencyHz, index) => {
    parts.push(generateTone(frequencyHz, noteDurationSec, sampleRate, amplitude));
    if (index < frequenciesHz.length - 1) parts.push(generateSilence(gapSec, sampleRate));
  });
  return concatFloat32(parts);
}

export const C_MAJOR_SCALE_HZ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
export const C_MAJOR_SCALE_MIDI = [60, 62, 64, 65, 67, 69, 71, 72];

export { encodeWavPcm16 } from "@hum2music/audio-analysis";

function concatFloat32(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
