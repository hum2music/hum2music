/** A transcribed note in absolute time, independent of any tempo hypothesis. */
export interface TimedNote {
  pitch: number;
  startMs: number;
  durationMs: number;
  velocity: number;
}
