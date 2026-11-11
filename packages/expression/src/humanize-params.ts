export interface InstrumentHumanizeParams {
  timingJitterMs: number;
  velocityJitterAmount: number;
  swingAmount: number;
  ghostNoteProbability: number;
}

/**
 * Baseline (fully-humanized, `--humanize 1`) parameters per instrument.
 * A single `--humanize` value maps to different concrete ranges per
 * instrument rather than one shared random multiplier (PRD §11.3) —
 * e.g. drums tolerate more timing/velocity variation than a sustained
 * melody. Proposed values, to be tuned against real recordings.
 */
const INSTRUMENT_BASELINES: Record<string, InstrumentHumanizeParams> = {
  melody: { timingJitterMs: 8, velocityJitterAmount: 6, swingAmount: 0.1, ghostNoteProbability: 0 },
  piano: { timingJitterMs: 10, velocityJitterAmount: 10, swingAmount: 0.1, ghostNoteProbability: 0.05 },
  bass: { timingJitterMs: 6, velocityJitterAmount: 8, swingAmount: 0.1, ghostNoteProbability: 0 },
  drums: { timingJitterMs: 15, velocityJitterAmount: 12, swingAmount: 0.2, ghostNoteProbability: 0.15 },
};

export function deriveHumanizeParams(humanizeAmount: number, instrument: string): InstrumentHumanizeParams {
  const baseline = INSTRUMENT_BASELINES[instrument] ?? INSTRUMENT_BASELINES.melody;
  const amount = Math.min(1, Math.max(0, humanizeAmount));

  return {
    timingJitterMs: baseline.timingJitterMs * amount,
    velocityJitterAmount: baseline.velocityJitterAmount * amount,
    swingAmount: baseline.swingAmount * amount,
    ghostNoteProbability: baseline.ghostNoteProbability * amount,
  };
}
