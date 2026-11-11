export type DrumType = "kick" | "snare" | "hihat";

export interface PitchedRenderNote {
  startMs: number;
  durationMs: number;
  velocity: number;
  frequencyHz: number;
}

export interface DrumRenderNote {
  startMs: number;
  durationMs: number;
  velocity: number;
  drumType: DrumType;
}
