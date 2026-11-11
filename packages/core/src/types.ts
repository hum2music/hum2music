export interface PitchFrame {
  timeMs: number;
  f0Hz: number | null;
  confidence: number;
  voiced: boolean;
}

export interface NoteCandidate {
  startMs: number;
  durationMs: number;
  rawPitch: number;
  pitchTrajectory: PitchFrame[];
  onsetConfidence: number;
}

/** One sample of a note's pitch deviation from its nominal pitch, in cents, at a time offset from note-on. */
export interface PitchCurveSample {
  offsetMs: number;
  cents: number;
}

export interface NoteEvent {
  pitch: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
  expression?: {
    pitchCurve?: PitchCurveSample[];
    timingOffsetMs?: number;
  };
}

export interface TempoCandidate {
  bpm: number;
  confidence: number;
  isHalfOrDoubleOf?: number;
}

export interface KeyCandidate {
  tonic: string;
  mode: "major" | "minor";
  confidence: number;
}

export interface ChordEvent {
  symbol: string;
  startBeat: number;
  durationBeats: number;
  confidence: number;
}

/** One labeled span of bars in a bar-level repetition analysis (e.g. A/A/B for a repeated 4-bar cycle). */
export interface SongSection {
  label: string;
  startBarIndex: number;
  barCount: number;
}

export interface InstrumentTrack {
  instrument: string;
  notes: NoteEvent[];
}

export interface Composition {
  metadata: {
    bpm: number;
    timeSignature: [number, number];
    key?: string;
  };
  melody: NoteEvent[];
  chords: ChordEvent[];
  tracks: InstrumentTrack[];
}
