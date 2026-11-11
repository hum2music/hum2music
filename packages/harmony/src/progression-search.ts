import type { ChordEvent, KeyCandidate } from "@hum2music/core";
import { NOTE_NAMES, isDiatonic, type ScaleMode } from "@hum2music/music-theory";
import { generateChordCandidates, type BarSegment, type ChordCandidate } from "./chord-candidates";
import { harmonicNaturalnessScore } from "./harmonic-naturalness";
import { voiceLeadingScore } from "./voice-leading";

export interface ProgressionSearchWeights {
  melodyFit: number;
  harmonicNaturalness: number;
  voiceLeading: number;
}

const DEFAULT_WEIGHTS: ProgressionSearchWeights = {
  melodyFit: 0.5,
  harmonicNaturalness: 0.3,
  voiceLeading: 0.2,
};

/**
 * Dynamic-programming search over bar-by-bar chord candidates, maximizing
 * S(c) = wM*M + wH*H + wV*V across the whole progression rather than
 * picking each bar's locally-best chord (PRD §8.3). The style term (S) is
 * left out of the MVP weighting (see docs/specs/style-profiles.md).
 */
export function searchChordProgression(
  bars: BarSegment[],
  topKey?: KeyCandidate,
  weights: ProgressionSearchWeights = DEFAULT_WEIGHTS,
): ChordEvent[] {
  if (bars.length === 0) return [];

  const candidatesPerBar = bars.map((bar) => generateChordCandidates(bar));
  const candidateCount = candidatesPerBar[0].length;

  const barScore = (candidate: ChordCandidate) =>
    weights.melodyFit * candidate.melodyFit * diatonicBonus(candidate.root, topKey);

  const dp: number[][] = candidatesPerBar.map(() => new Array(candidateCount).fill(-Infinity));
  const parent: number[][] = candidatesPerBar.map(() => new Array(candidateCount).fill(-1));

  for (let c = 0; c < candidateCount; c++) {
    dp[0][c] = barScore(candidatesPerBar[0][c]);
  }

  for (let i = 1; i < bars.length; i++) {
    for (let c = 0; c < candidateCount; c++) {
      const candidate = candidatesPerBar[i][c];
      let best = -Infinity;
      let bestPrev = -1;

      for (let p = 0; p < candidateCount; p++) {
        const prevCandidate = candidatesPerBar[i - 1][p];
        const transitionScore =
          weights.harmonicNaturalness * harmonicNaturalnessScore(prevCandidate.root, candidate.root) +
          weights.voiceLeading *
            voiceLeadingScore(prevCandidate.root, prevCandidate.quality, candidate.root, candidate.quality);
        const score = dp[i - 1][p] + transitionScore;
        if (score > best) {
          best = score;
          bestPrev = p;
        }
      }

      dp[i][c] = best + barScore(candidate);
      parent[i][c] = bestPrev;
    }
  }

  const lastBarIndex = bars.length - 1;
  let bestLastCandidate = 0;
  for (let c = 1; c < candidateCount; c++) {
    if (dp[lastBarIndex][c] > dp[lastBarIndex][bestLastCandidate]) bestLastCandidate = c;
  }

  const chosenIndexPerBar = new Array<number>(bars.length);
  chosenIndexPerBar[lastBarIndex] = bestLastCandidate;
  for (let i = lastBarIndex; i > 0; i--) {
    chosenIndexPerBar[i - 1] = parent[i][chosenIndexPerBar[i]];
  }

  return bars.map((bar, i) => {
    const candidate = candidatesPerBar[i][chosenIndexPerBar[i]];
    return {
      symbol: candidate.symbol,
      startBeat: bar.startBeat,
      durationBeats: bar.endBeat - bar.startBeat,
      confidence: candidate.melodyFit,
    };
  });
}

function diatonicBonus(root: number, topKey?: KeyCandidate): number {
  if (!topKey) return 1;
  const tonicPitchClass = (NOTE_NAMES as readonly string[]).indexOf(topKey.tonic);
  if (tonicPitchClass === -1) return 1;
  return isDiatonic(root, tonicPitchClass, topKey.mode as ScaleMode) ? 1 : 0.85;
}
