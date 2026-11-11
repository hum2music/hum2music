import { describe, expect, test } from "bun:test";
import { resolveStyleProfile, STYLE_PROFILES } from "@hum2music/arrangement";

describe("resolveStyleProfile", () => {
  test("resolves known style names", () => {
    expect(resolveStyleProfile("pop")).toEqual(STYLE_PROFILES.pop);
    expect(resolveStyleProfile("ballad")).toEqual(STYLE_PROFILES.ballad);
  });

  test("falls back to pop for an unknown or missing name", () => {
    expect(resolveStyleProfile(undefined)).toEqual(STYLE_PROFILES.pop);
    expect(resolveStyleProfile("not-a-style")).toEqual(STYLE_PROFILES.pop);
  });

  test("pop and ballad differ in at least pattern and humanize intensity", () => {
    expect(STYLE_PROFILES.pop.pianoPattern).not.toBe(STYLE_PROFILES.ballad.pianoPattern);
    expect(STYLE_PROFILES.pop.humanizeMultiplier).not.toBe(STYLE_PROFILES.ballad.humanizeMultiplier);
  });
});
