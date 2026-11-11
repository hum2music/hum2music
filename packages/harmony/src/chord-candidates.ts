import { CHORD_QUALITIES, type ChordQuality, chordPitchClasses, chordSymbol, pitchClassOf } from "@hum2music/music-theory";

export interface ChordCandidate {
  root: number;
  quality: ChordQuality;
  symbol: string;
  /** Fraction (0-1) of the bar's duration-weighted pitch-class mass that are chord tones. */
  melodyFit: number;
}

export interface WeightedPitch {
  pitch: number;
  /** Duration (in beats) this pitch occupies within the bar. */
  weight: number;
}

export interface BarSegment {
  startBeat: number;
  endBeat: number;
  notes: WeightedPitch[];
}

/** Generates every (root, quality) chord as a scored candidate for one bar. */
export function generateChordCandidates(segment: BarSegment): ChordCandidate[] {
  const histogram = buildWeightedPitchClassHistogram(segment.notes);
  const candidates: ChordCandidate[] = [];

  for (let root = 0; root < 12; root++) {
    for (const quality of CHORD_QUALITIES) {
      const chordTones = new Set(chordPitchClasses(root, quality));
      candidates.push({
        root,
        quality,
        symbol: chordSymbol(root, quality),
        melodyFit: scoreMelodyFit(histogram, chordTones),
      });
    }
  }

  return candidates;
}

function buildWeightedPitchClassHistogram(notes: WeightedPitch[]): number[] {
  const histogram = new Array(12).fill(0);
  for (const note of notes) histogram[pitchClassOf(note.pitch)] += note.weight;
  const total = histogram.reduce((sum, value) => sum + value, 0);
  return total === 0 ? histogram : histogram.map((value) => value / total);
}

/**
 * Fraction of the bar's pitch-class mass covered by this chord's tones,
 * scaled down by how many of the chord's own tones go unconfirmed by the
 * melody. Without this scaling, a 7th/6th chord whose extra tone simply
 * never sounds would always tie a plain triad that covers the same notes,
 * since an absent tone costs nothing — this way the smallest chord that
 * fully explains the melody wins, rather than an assumed, unheard tension.
 */
function scoreMelodyFit(histogram: number[], chordTones: Set<number>): number {
  let matchedMass = 0;
  let confirmedToneCount = 0;
  for (const pitchClass of chordTones) {
    if (histogram[pitchClass] > 0) {
      matchedMass += histogram[pitchClass];
      confirmedToneCount++;
    }
  }
  const confirmedCoverage = confirmedToneCount / chordTones.size;
  return matchedMass * confirmedCoverage;
}
