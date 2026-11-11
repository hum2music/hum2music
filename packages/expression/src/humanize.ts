import type { NoteEvent } from "@hum2music/core";
import { applyDynamicArc, applyVelocityHumanization } from "./dynamics";
import { deriveHumanizeParams } from "./humanize-params";
import { applyVibrato } from "./pitch";
import { createSeededRandom, deriveSeed } from "./rng";
import { applySwing, applyTimingJitter } from "./timing";

export interface HumanizeOptions {
  seed: number;
  humanizeAmount: number;
  bpm: number;
  instrument?: string;
}

const VIBRATO_DEPTH_CENTS_AT_FULL_HUMANIZE = 20;

/**
 * Applies the full expression/humanization pipeline to a quantized melody:
 * swing, seeded timing/velocity variation, a phrase-level dynamic arc, and
 * vibrato on sustained notes. Each layer is independently seeded from the
 * same top-level seed so results are fully reproducible (PRD §15.1).
 */
export function humanizeMelody(notes: NoteEvent[], options: HumanizeOptions): NoteEvent[] {
  const instrument = options.instrument ?? "melody";
  const params = deriveHumanizeParams(options.humanizeAmount, instrument);
  const random = createSeededRandom(deriveSeed(options.seed, instrument));

  let result = notes;
  result = applySwing(result, params.swingAmount);
  result = applyTimingJitter(result, params, random);
  result = applyVelocityHumanization(result, params, random);
  result = applyDynamicArc(result, options.humanizeAmount);
  result = applyVibrato(result, VIBRATO_DEPTH_CENTS_AT_FULL_HUMANIZE * options.humanizeAmount, options.bpm);
  return result;
}
