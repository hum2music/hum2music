import type { NoteEvent } from "@hum2music/core";
import { generateCounterpointVoice } from "@hum2music/counterpoint";
import { themeAndVariations } from "@hum2music/form";
import { augment, extractMotif, invert, retrograde, transpose } from "@hum2music/motif";
import type { ComposerContext, ComposerResult, Hum2MusicPlugin } from "@hum2music/plugin-api";

/** Fixed-length motif extraction; see @hum2music/motif's extractMotif doc comment for why this is a naive, explicitly-documented heuristic. */
const MOTIF_LENGTH = 8;
const AUGMENT_FACTOR = 2;
const TRANSPOSE_UP_A_FIFTH = 7;
/** Lowest practical pitch for the generated second voice (A0, the bottom of a piano) — the voice is abstract (no instrument plugin attached), so this is just a sane absolute floor, not a specific instrument's range. */
const LOWER_VOICE_FLOOR_PITCH = 21;
const COUNTERPOINT_VELOCITY = 70;

function compose(context: ComposerContext): Promise<ComposerResult> {
  const theme = extractMotif(context.melody, Math.min(MOTIF_LENGTH, context.melody.length));

  const { notes: themeNotes, sections } = themeAndVariations(theme, [
    { label: "Var. 1 (transposed up a 5th)", transform: (notes) => transpose(notes, TRANSPOSE_UP_A_FIFTH) },
    { label: "Var. 2 (inverted)", transform: (notes) => invert(notes) },
    { label: "Var. 3 (retrograde)", transform: (notes) => retrograde(notes) },
    { label: "Var. 4 (augmented)", transform: (notes) => augment(notes, AUGMENT_FACTOR) },
  ]);

  const counterpointVoice = generateCounterpointVoice(themeNotes, {
    range: { min: LOWER_VOICE_FLOOR_PITCH, max: Math.max(...themeNotes.map((note) => note.pitch)) },
    above: false,
    velocity: COUNTERPOINT_VELOCITY,
  });

  return Promise.resolve({ notes: mergeByTime(themeNotes, counterpointVoice), sections });
}

function mergeByTime(a: NoteEvent[], b: NoteEvent[]): NoteEvent[] {
  return [...a, ...b].sort((left, right) => left.startBeat - right.startBeat);
}

/**
 * Builds a Theme and Variations piece, same as
 * @hum2music/composer-motif-development, but adds a real second voice
 * from the Counterpoint Engine underneath the theme throughout — the
 * Composer Plugin the ROADMAP flagged as still missing: one that
 * actually combines Motif/Form development with first-species
 * counterpoint, rather than leaving the Counterpoint Engine reachable
 * only through `--orchestrate`'s countermelody role.
 */
export const choraleComposerPlugin: Hum2MusicPlugin = {
  id: "@hum2music/composer-chorale",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.composers.register({ id: "chorale", compose });
  },
};
