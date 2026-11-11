import type { InstrumentHumanizeParams } from "./humanize-params";

/** A realized set of humanization values for a single drum hit (PRD §10.5). */
export interface DrumHumanization {
  timingOffsetMs: number;
  velocityOffset: number;
  swingAmount: number;
  ghostNoteProbability: number;
}

/**
 * Computes one drum hit's humanization. Not yet wired into a drum
 * arranger (that's future arrangement work), but implemented and tested
 * standalone now. `beatPositionInBar` damps the random range on downbeats,
 * same rule-dependent approach as melody timing/velocity humanization.
 */
export function computeDrumHumanization(
  params: InstrumentHumanizeParams,
  beatPositionInBar: number,
  random: () => number,
): DrumHumanization {
  const isDownbeat = Math.abs(beatPositionInBar % 4) < 1e-6;
  const positionalScale = isDownbeat ? 0.3 : 1;

  return {
    timingOffsetMs: (random() * 2 - 1) * params.timingJitterMs * positionalScale,
    velocityOffset: (random() * 2 - 1) * params.velocityJitterAmount * positionalScale,
    swingAmount: params.swingAmount,
    ghostNoteProbability: params.ghostNoteProbability,
  };
}
