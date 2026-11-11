import { createSeededRandom } from "@hum2music/expression";
import type { DrumRenderNote, DrumType, PitchedRenderNote } from "./types";

export interface RenderOptions {
  sampleRate?: number;
  /** Seeds the noise generator used for drum synthesis, for reproducibility (PRD §15.1). */
  seed?: number;
}

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_SEED = 42;
const TAIL_MS = 300;

/**
 * Minimal software synth: sine-wave oscillators (with a short attack/
 * release envelope) for pitched notes, and simple decaying tone/noise
 * bursts for drum hits. Not meant to sound "produced" — just an audible,
 * deterministic preview, per PRD §13.3's explicit MVP bar.
 */
export function renderToSamples(
  pitchedNotes: PitchedRenderNote[],
  drumNotes: DrumRenderNote[],
  options: RenderOptions = {},
): Float32Array {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const random = createSeededRandom(options.seed ?? DEFAULT_SEED);

  const endMs =
    Math.max(
      0,
      ...pitchedNotes.map((note) => note.startMs + note.durationMs),
      ...drumNotes.map((note) => note.startMs + note.durationMs),
    ) + TAIL_MS;
  const output = new Float32Array(Math.ceil((endMs / 1000) * sampleRate));

  for (const note of pitchedNotes) renderPitchedNote(output, note, sampleRate);
  for (const note of drumNotes) renderDrumNote(output, note, sampleRate, random);

  normalizeInPlace(output);
  return output;
}

function renderPitchedNote(output: Float32Array, note: PitchedRenderNote, sampleRate: number): void {
  const startSample = Math.max(0, Math.round((note.startMs / 1000) * sampleRate));
  const durationSamples = Math.max(1, Math.round((note.durationMs / 1000) * sampleRate));
  const attackSamples = Math.min(durationSamples, Math.round(sampleRate * 0.01));
  const releaseSamples = Math.min(durationSamples, Math.round(sampleRate * 0.05));
  const amplitude = (note.velocity / 127) * 0.25;

  for (let i = 0; i < durationSamples; i++) {
    const index = startSample + i;
    if (index >= output.length) break;
    const envelope = envelopeAt(i, durationSamples, attackSamples, releaseSamples);
    const time = i / sampleRate;
    output[index] += Math.sin(2 * Math.PI * note.frequencyHz * time) * amplitude * envelope;
  }
}

function envelopeAt(i: number, duration: number, attack: number, release: number): number {
  if (i < attack) return i / attack;
  if (i > duration - release) return Math.max(0, (duration - i) / release);
  return 1;
}

const DRUM_PROFILES: Record<DrumType, { durationSec: number; decayRate: number; amplitude: number }> = {
  kick: { durationSec: 0.15, decayRate: 20, amplitude: 0.5 },
  snare: { durationSec: 0.15, decayRate: 15, amplitude: 0.4 },
  hihat: { durationSec: 0.05, decayRate: 60, amplitude: 0.2 },
};

function renderDrumNote(output: Float32Array, note: DrumRenderNote, sampleRate: number, random: () => number): void {
  const profile = DRUM_PROFILES[note.drumType];
  const startSample = Math.max(0, Math.round((note.startMs / 1000) * sampleRate));
  const durationSamples = Math.round(profile.durationSec * sampleRate);
  const amplitude = (note.velocity / 127) * profile.amplitude;

  for (let i = 0; i < durationSamples; i++) {
    const index = startSample + i;
    if (index >= output.length) break;
    const time = i / sampleRate;
    const decay = Math.exp(-time * profile.decayRate);
    const signal =
      note.drumType === "kick"
        ? Math.sin(2 * Math.PI * (120 * Math.pow(0.08, time / profile.durationSec)) * time)
        : random() * 2 - 1;

    output[index] += signal * amplitude * decay;
  }
}

function normalizeInPlace(samples: Float32Array): void {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak <= 1) return;

  const scale = 0.98 / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
}
