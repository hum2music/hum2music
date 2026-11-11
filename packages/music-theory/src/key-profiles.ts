import type { ScaleMode } from "./scales";

/**
 * Krumhansl-Kessler key profiles: empirically measured perceived stability
 * of each pitch class relative to a tonic, indexed by semitone above that
 * tonic. Used to correlate a melody's pitch-class distribution against all
 * 24 candidate keys (Krumhansl & Kessler, 1982).
 */
export const KEY_PROFILES: Record<ScaleMode, number[]> = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
};
