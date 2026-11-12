import { themeAndVariations } from "@hum2music/form";
import { augment, extractMotif, invert, retrograde, transpose } from "@hum2music/motif";
import type { ComposerContext, ComposerResult, Hum2MusicPlugin } from "@hum2music/plugin-api";

/** Fixed-length motif extraction; see @hum2music/motif's extractMotif doc comment for why this is a naive, explicitly-documented heuristic. */
const MOTIF_LENGTH = 8;
const AUGMENT_FACTOR = 2;
const TRANSPOSE_UP_A_FIFTH = 7;

function compose(context: ComposerContext): Promise<ComposerResult> {
  const theme = extractMotif(context.melody, Math.min(MOTIF_LENGTH, context.melody.length));

  const result = themeAndVariations(theme, [
    { label: "Var. 1 (transposed up a 5th)", transform: (notes) => transpose(notes, TRANSPOSE_UP_A_FIFTH) },
    { label: "Var. 2 (inverted)", transform: (notes) => invert(notes) },
    { label: "Var. 3 (retrograde)", transform: (notes) => retrograde(notes) },
    { label: "Var. 4 (augmented)", transform: (notes) => augment(notes, AUGMENT_FACTOR) },
  ]);

  return Promise.resolve(result);
}

/**
 * Builds a Theme and Variations piece directly from the Motif Development
 * Engine and Form Engine (PRD UPDATE_PRD.md §8.2, §8.4) — the first real
 * ComposerPlugin, demonstrating the registry end to end. Fully
 * deterministic (no randomness anywhere in motif transformation or form
 * layout), so `context.seed` isn't consulted; it's still part of the
 * contract for Composer Plugins that do need one.
 */
export const motifDevelopmentComposerPlugin: Hum2MusicPlugin = {
  id: "@hum2music/composer-motif-development",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.composers.register({ id: "motif-development", compose });
  },
};
