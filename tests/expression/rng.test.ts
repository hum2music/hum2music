import { describe, expect, test } from "bun:test";
import { createSeededRandom, deriveSeed } from "@hum2music/expression";

describe("createSeededRandom", () => {
  test("is deterministic for the same seed", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());
    expect(sequenceB).toEqual(sequenceA);
  });

  test("produces different sequences for different seeds", () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());
    expect(sequenceB).not.toEqual(sequenceA);
  });

  test("stays within [0, 1)", () => {
    const random = createSeededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("deriveSeed", () => {
  test("is deterministic for the same inputs", () => {
    expect(deriveSeed(42, "melody", 3)).toBe(deriveSeed(42, "melody", 3));
  });

  test("differs by track name", () => {
    expect(deriveSeed(42, "melody")).not.toBe(deriveSeed(42, "drums"));
  });

  test("differs by top-level seed", () => {
    expect(deriveSeed(1, "melody")).not.toBe(deriveSeed(2, "melody"));
  });
});
