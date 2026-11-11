import { type ChordQuality, chordPitchClasses, pitchClassDistance } from "@hum2music/music-theory";

/**
 * Scores voice-leading smoothness between two chords as the inverse of the
 * average nearest-tone movement (in semitones) from the previous chord's
 * tones to the current chord's tones (PRD §8.3's V term).
 */
export function voiceLeadingScore(
  prevRoot: number,
  prevQuality: ChordQuality,
  curRoot: number,
  curQuality: ChordQuality,
): number {
  const prevTones = chordPitchClasses(prevRoot, prevQuality);
  const curTones = chordPitchClasses(curRoot, curQuality);

  const totalMovement = prevTones.reduce((sum, prevTone) => {
    const nearestDistance = Math.min(...curTones.map((curTone) => Math.abs(pitchClassDistance(prevTone, curTone))));
    return sum + nearestDistance;
  }, 0);

  const averageMovement = totalMovement / prevTones.length;
  return 1 - averageMovement / 6;
}
