export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function pitchClassOf(midiNote: number): number {
  return ((midiNote % 12) + 12) % 12;
}

export function pitchClassName(pitchClass: number): string {
  return NOTE_NAMES[pitchClassOf(pitchClass)];
}

/** Signed distance in [-6, 6] from `a` to `b` around the 12-pitch-class circle. */
export function pitchClassDistance(a: number, b: number): number {
  const raw = pitchClassOf(b - a);
  return raw > 6 ? raw - 12 : raw;
}
