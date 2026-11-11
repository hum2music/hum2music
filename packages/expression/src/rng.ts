/** Deterministic PRNG (mulberry32): same seed always produces the same sequence. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function random(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives a sub-seed from a top-level seed and any number of identifying
 * parts (e.g. track name, bar index), so different tracks/bars get
 * independent-looking but still fully reproducible randomness from one
 * `--seed` value.
 */
export function deriveSeed(seed: number, ...parts: Array<string | number>): number {
  let hash = seed >>> 0;
  const text = parts.join("|");
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
