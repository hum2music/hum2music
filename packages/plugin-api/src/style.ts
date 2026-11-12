/**
 * Each policy is an intentionally open, serializable bag of settings; the
 * actual composition logic they configure belongs to a Composer/Arranger/
 * Expression plugin, not to the style itself (PRD UPDATE_PRD.md §7.2). The
 * named fields below are the subset actually read by the built-in
 * instrument plugins (plugins/instruments/*) — not a closed schema, since
 * `[key: string]: unknown` still allows any other plugin to store whatever
 * it needs here.
 */
export interface HarmonyPolicy {
  /** Fed into @hum2music/harmony's searchChordProgression, upstream of compose() — not read by any InstrumentArranger directly. */
  progressionWeights?: { melodyFit: number; harmonicNaturalness: number; voiceLeading: number };
  [key: string]: unknown;
}
export interface RhythmPolicy {
  drumDensity?: "normal" | "sparse";
  guitarPattern?: "strum" | "arpeggio";
  [key: string]: unknown;
}
export interface FormPolicy {
  [key: string]: unknown;
}
export interface OrchestrationPolicy {
  pianoPattern?: "block" | "arpeggio";
  pianoAllowExtensions?: boolean;
  /** When true, the piano arranger merges the input melody into its own track (right hand) alongside its chord voicing (left hand) — a true piano-solo texture, rather than chords-only accompaniment. */
  pianoIncludeMelody?: boolean;
  /** Instrument ID -> GM program number, overriding that instrument's own InstrumentDefinition.midi.program for this style only. */
  programNumbers?: Record<string, number>;
  [key: string]: unknown;
}
export interface ExpressionPolicy {
  humanizeMultiplier?: number;
  [key: string]: unknown;
}

export interface StyleDefinition {
  id: string;
  name: string;
  harmony?: HarmonyPolicy;
  rhythm?: RhythmPolicy;
  form?: FormPolicy;
  orchestration?: OrchestrationPolicy;
  expression?: ExpressionPolicy;
  defaultInstruments?: string[];
}
