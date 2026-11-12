/**
 * A resolved SoundFont2 zone: the generator values actually in effect for
 * notes falling in `keyRange`/`velRange`, after merging a global zone's
 * defaults (if any) under the zone's own local generators. Only the
 * generators this renderer actually acts on are kept (PRD UPDATE_PRD.md
 * §6.3's SoundFont Renderer target list minus modulators/LFOs/filters -
 * see this package's README-equivalent doc comment in render.ts for the
 * exact scope).
 */
export interface SoundFontZone {
  keyRangeLow: number;
  keyRangeHigh: number;
  velRangeLow: number;
  velRangeHigh: number;
  /** Index into `SoundFont2.samples`. */
  sampleIndex: number;
  /** Overrides the sample's own originalPitch, when set (SF2 "overridingRootKey"). */
  overridingRootKey: number | undefined;
  /** Semitones, additive with the sample's own pitch correction. */
  coarseTune: number;
  /** Cents, additive with the sample's own pitch correction. */
  fineTune: number;
  /** -500 (full left) to 500 (full right), 0 = center. */
  pan: number;
  /** Centibels of attenuation (higher = quieter). */
  initialAttenuation: number;
  /** 0 = no loop, 1 = loop continuously, 3 = loop then play the remainder once after the note ends. SF2's "2" (reserved) is treated as 0. */
  sampleModes: 0 | 1 | 3;
}

export interface SoundFontInstrument {
  name: string;
  zones: SoundFontZone[];
}

export interface SoundFontPresetZone {
  keyRangeLow: number;
  keyRangeHigh: number;
  velRangeLow: number;
  velRangeHigh: number;
  /** Index into `SoundFont2.instruments`. */
  instrumentIndex: number;
}

export interface SoundFontPreset {
  name: string;
  /** GM program number (0-127) for bank 0; for bank 128 (percussion), this project treats it as a drum kit selector (see render.ts). */
  presetNumber: number;
  bank: number;
  zones: SoundFontPresetZone[];
}

export interface SoundFontSample {
  name: string;
  /** Raw PCM16 samples for this sample alone (already sliced out of the file's single concatenated sample pool). */
  data: Int16Array;
  sampleRate: number;
  /** Loop points, as offsets into `data` (already relative, not absolute file offsets). */
  startLoop: number;
  endLoop: number;
  /** MIDI key this sample plays at its original (unshifted) pitch. */
  originalPitch: number;
  /** Cents, in [-99, 99], further tuning the sample pitch. */
  pitchCorrection: number;
}

export interface SoundFont2 {
  presets: SoundFontPreset[];
  instruments: SoundFontInstrument[];
  samples: SoundFontSample[];
}
