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

export interface NoteEvent {
  pitch: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
  expression?: {
    pitchCurve?: number[];
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
