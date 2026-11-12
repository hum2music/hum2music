import type { NoteEvent } from "@hum2music/core";
import { layoutSegments, type FormResult } from "./layout.js";

/** A B — PRD UPDATE_PRD.md §8.4's Binary Form. */
export function binaryForm(theme: NoteEvent[], contrastingMaterial: NoteEvent[]): FormResult {
  return layoutSegments([
    { label: "A", notes: theme },
    { label: "B", notes: contrastingMaterial },
  ]);
}

/** A B A' (the reprise is the same material as the opening) — PRD UPDATE_PRD.md §8.4's Ternary Form. */
export function ternaryForm(theme: NoteEvent[], contrastingMaterial: NoteEvent[]): FormResult {
  return layoutSegments([
    { label: "A", notes: theme },
    { label: "B", notes: contrastingMaterial },
    { label: "A'", notes: theme },
  ]);
}

export interface VariationStep {
  label: string;
  /** Typically a @hum2music/motif transformation (transpose/invert/augment/diminish/sequence/fragment), partially applied. */
  transform: (notes: NoteEvent[]) => NoteEvent[];
}

/**
 * Theme, followed by one segment per entry in `variations`, each the
 * theme passed through that entry's transform — PRD UPDATE_PRD.md §8.4's
 * Theme and Variations, built directly on the Motif Development Engine's
 * transformations rather than reimplementing variation logic here.
 */
export function themeAndVariations(theme: NoteEvent[], variations: VariationStep[]): FormResult {
  const segments = [{ label: "Theme", notes: theme }, ...variations.map((v) => ({ label: v.label, notes: v.transform(theme) }))];
  return layoutSegments(segments);
}
