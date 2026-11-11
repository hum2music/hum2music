export interface DenoiseOptions {
  /** High-pass cutoff in Hz; removes DC offset and low-frequency rumble/handling noise below typical hum/vocal fundamentals. */
  highPassHz?: number;
  /** How many times louder than the estimated noise floor a frame's RMS must be to stay open (pass through unattenuated). */
  gateThresholdMultiplier?: number;
  /** Linear gain applied to frames below the gate threshold (0 = silence, 1 = no attenuation). */
  gateFloorGain?: number;
  /** Frame size in samples used to estimate local RMS and to smooth the gate's gain changes between frames. */
  frameSize?: number;
}

const DEFAULT_HIGH_PASS_HZ = 80;
const DEFAULT_GATE_THRESHOLD_MULTIPLIER = 2.5;
const DEFAULT_GATE_FLOOR_GAIN = 0.15;
const DEFAULT_FRAME_SIZE = 512;
const GATE_SMOOTHING_FACTOR = 0.3;
const UNITY_GAIN = 1;
/** Fraction of frames, sorted quietest-first, used to estimate the noise floor. */
const QUIET_FRAME_FRACTION = 1 / 3;

/**
 * Deterministic audio-preprocessing pass applied before pitch detection:
 * a high-pass filter for DC offset/rumble, followed by a noise gate that
 * attenuates (not mutes) frames quieter than the recording's own noise
 * floor. Runs once on the decoded samples, upstream of `detectPitchYin`/
 * `transcribeMelody`, so both stay pure signal-to-pitch/note functions.
 */
export function reduceNoise(samples: Float32Array, sampleRate: number, options: DenoiseOptions = {}): Float32Array {
  if (samples.length === 0) return samples;

  const highPassed = applyHighPassFilter(samples, sampleRate, options.highPassHz ?? DEFAULT_HIGH_PASS_HZ);
  return applyNoiseGate(highPassed, options);
}

function applyHighPassFilter(samples: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = rc / (rc + dt);

  const output = new Float32Array(samples.length);
  let previousInput = 0;
  let previousOutput = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = alpha * (previousOutput + samples[i] - previousInput);
    output[i] = value;
    previousInput = samples[i];
    previousOutput = value;
  }
  return output;
}

function applyNoiseGate(samples: Float32Array, options: DenoiseOptions): Float32Array {
  const frameSize = options.frameSize ?? DEFAULT_FRAME_SIZE;
  const thresholdMultiplier = options.gateThresholdMultiplier ?? DEFAULT_GATE_THRESHOLD_MULTIPLIER;
  const floorGain = options.gateFloorGain ?? DEFAULT_GATE_FLOOR_GAIN;

  const frameCount = Math.ceil(samples.length / frameSize);
  const frameRms = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    const start = frame * frameSize;
    const end = Math.min(samples.length, start + frameSize);
    let sumOfSquares = 0;
    for (let i = start; i < end; i++) sumOfSquares += samples[i] * samples[i];
    frameRms[frame] = Math.sqrt(sumOfSquares / (end - start));
  }

  const gateThreshold = estimateNoiseFloor(frameRms) * thresholdMultiplier;
  const targetGain = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    targetGain[frame] = frameRms[frame] < gateThreshold ? floorGain : UNITY_GAIN;
  }
  const smoothedGain = smoothGain(targetGain);

  const output = new Float32Array(samples.length);
  for (let frame = 0; frame < frameCount; frame++) {
    const start = frame * frameSize;
    const end = Math.min(samples.length, start + frameSize);
    const gain = smoothedGain[frame];
    for (let i = start; i < end; i++) output[i] = samples[i] * gain;
  }
  return output;
}

/**
 * Noise floor = median RMS of the quietest third of frames, not the global
 * minimum — robust to a recording that's mostly voiced but has a handful of
 * truly silent frames at the start/end.
 */
function estimateNoiseFloor(frameRms: Float32Array): number {
  const sorted = Array.from(frameRms).sort((a, b) => a - b);
  const quietCount = Math.max(1, Math.floor(sorted.length * QUIET_FRAME_FRACTION));
  const quietest = sorted.slice(0, quietCount);
  const mid = Math.floor(quietest.length / 2);
  return quietest.length % 2 === 0 ? (quietest[mid - 1] + quietest[mid]) / 2 : quietest[mid];
}

function smoothGain(targetGain: Float32Array): Float32Array {
  const smoothed = new Float32Array(targetGain.length);
  let previous = targetGain[0] ?? UNITY_GAIN;
  for (let i = 0; i < targetGain.length; i++) {
    previous += (targetGain[i] - previous) * GATE_SMOOTHING_FACTOR;
    smoothed[i] = previous;
  }
  return smoothed;
}
