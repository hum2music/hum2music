import type { SoundFont2, SoundFontInstrument, SoundFontPreset, SoundFontSample, SoundFontZone } from "./types.ts";

export interface SoundFontNote {
  pitch: number;
  velocity: number;
  startMs: number;
  durationMs: number;
}

export interface StereoBuffer {
  left: Float32Array;
  right: Float32Array;
}

/** How long a note rings after its written duration elapses, standing in for the SF2 volume envelope's release stage (see parse.ts's doc comment for why a real ADSR envelope isn't implemented). */
const RELEASE_MS = 60;
const INT16_FULL_SCALE = 32768;

export function findPreset(soundFont: SoundFont2, programNumber: number, bank: number): SoundFontPreset | undefined {
  return soundFont.presets.find((preset) => preset.presetNumber === programNumber && preset.bank === bank);
}

function findInstrumentZone(instrument: SoundFontInstrument, pitch: number, velocity: number): SoundFontZone | undefined {
  return instrument.zones.find(
    (zone) =>
      pitch >= zone.keyRangeLow && pitch <= zone.keyRangeHigh && velocity >= zone.velRangeLow && velocity <= zone.velRangeHigh,
  );
}

/**
 * Renders one note by playing back its matched sample pitch-shifted
 * (linear-interpolation resampling - no higher-order interpolation),
 * panned, and attenuated by both velocity and the zone's
 * initialAttenuation. Returns `undefined` if no preset/instrument zone
 * covers this (programNumber, bank, pitch, velocity) combination -
 * callers are expected to warn and fall back, same convention as
 * @hum2music/renderer-builtin-synth's unmapped-instrument fallback.
 */
export function renderSoundFontNote(
  soundFont: SoundFont2,
  programNumber: number,
  bank: number,
  note: SoundFontNote,
  outputSampleRate: number,
): StereoBuffer | undefined {
  const preset = findPreset(soundFont, programNumber, bank);
  if (!preset) return undefined;

  const presetZone = preset.zones.find(
    (zone) =>
      note.pitch >= zone.keyRangeLow &&
      note.pitch <= zone.keyRangeHigh &&
      note.velocity >= zone.velRangeLow &&
      note.velocity <= zone.velRangeHigh,
  );
  if (!presetZone) return undefined;

  const instrument = soundFont.instruments[presetZone.instrumentIndex];
  if (!instrument) return undefined;

  const zone = findInstrumentZone(instrument, note.pitch, note.velocity);
  if (!zone) return undefined;

  const sample = soundFont.samples[zone.sampleIndex];
  if (!sample || sample.data.length === 0) return undefined;

  return synthesizeZone(sample, zone, note, outputSampleRate);
}

function synthesizeZone(sample: SoundFontSample, zone: SoundFontZone, note: SoundFontNote, outputSampleRate: number): StereoBuffer {
  const effectiveRootKey = zone.overridingRootKey ?? sample.originalPitch;
  const totalCents = zone.coarseTune * 100 + zone.fineTune + sample.pitchCorrection;
  const semitoneShift = note.pitch - effectiveRootKey + totalCents / 100;
  const pitchRatio = 2 ** (semitoneShift / 12);
  const sourceStep = pitchRatio * (sample.sampleRate / outputSampleRate);

  const attenuationGain = 10 ** (-zone.initialAttenuation / 200);
  const velocityGain = Math.max(0, Math.min(1, note.velocity / 127));
  const panAngle = ((zone.pan + 500) / 1000) * (Math.PI / 2);
  const leftPan = Math.cos(panAngle);
  const rightPan = Math.sin(panAngle);

  const sustainSamples = Math.round((note.durationMs / 1000) * outputSampleRate);
  const releaseSamples = Math.round((RELEASE_MS / 1000) * outputSampleRate);
  const maxOutputSamples = sustainSamples + releaseSamples;

  const left = new Float32Array(maxOutputSamples);
  const right = new Float32Array(maxOutputSamples);

  const looping = zone.sampleModes === 1 || zone.sampleModes === 3;
  const loopLength = sample.endLoop - sample.startLoop;
  let sourcePosition = 0;
  let outputIndex = 0;

  for (; outputIndex < maxOutputSamples; outputIndex++) {
    if (!looping && sourcePosition >= sample.data.length - 1) break;

    const envelopeGain =
      outputIndex < sustainSamples ? 1 : Math.max(0, 1 - (outputIndex - sustainSamples) / releaseSamples);
    if (envelopeGain <= 0) break;

    const sampleValue = readLinearInterpolated(sample.data, sourcePosition) / INT16_FULL_SCALE;
    const totalGain = sampleValue * attenuationGain * velocityGain * envelopeGain;
    left[outputIndex] = totalGain * leftPan;
    right[outputIndex] = totalGain * rightPan;

    sourcePosition += sourceStep;
    while (looping && loopLength > 0 && sourcePosition >= sample.endLoop) {
      sourcePosition -= loopLength;
    }
  }

  return { left: left.subarray(0, outputIndex), right: right.subarray(0, outputIndex) };
}

function readLinearInterpolated(data: Int16Array, position: number): number {
  const index = Math.floor(position);
  const fraction = position - index;
  const a = data[index] ?? 0;
  const b = data[index + 1] ?? a;
  return a + (b - a) * fraction;
}
