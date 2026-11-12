import { describe, expect, test } from "bun:test";
import { classifyMotion, crossesVoices, hasForbiddenParallelPerfect, isConsonant, isPerfectConsonance } from "@hum2music/counterpoint";

describe("isConsonant", () => {
  test("treats unison, 3rds, 5th, and 6ths as consonant", () => {
    expect(isConsonant(60, 60)).toBe(true); // unison
    expect(isConsonant(60, 63)).toBe(true); // minor 3rd
    expect(isConsonant(60, 64)).toBe(true); // major 3rd
    expect(isConsonant(60, 67)).toBe(true); // perfect 5th
    expect(isConsonant(60, 68)).toBe(true); // minor 6th
    expect(isConsonant(60, 69)).toBe(true); // major 6th
    expect(isConsonant(60, 72)).toBe(true); // octave
  });

  test("treats 2nds, perfect 4th, tritone, and 7ths as dissonant", () => {
    expect(isConsonant(60, 61)).toBe(false);
    expect(isConsonant(60, 62)).toBe(false);
    expect(isConsonant(60, 65)).toBe(false); // perfect 4th
    expect(isConsonant(60, 66)).toBe(false); // tritone
    expect(isConsonant(60, 70)).toBe(false);
    expect(isConsonant(60, 71)).toBe(false);
  });
});

describe("isPerfectConsonance", () => {
  test("is true only for unison/octave and the perfect 5th", () => {
    expect(isPerfectConsonance(60, 60)).toBe(true);
    expect(isPerfectConsonance(60, 72)).toBe(true);
    expect(isPerfectConsonance(60, 67)).toBe(true);
    expect(isPerfectConsonance(60, 64)).toBe(false);
    expect(isPerfectConsonance(60, 69)).toBe(false);
  });
});

describe("classifyMotion", () => {
  test("oblique when one voice holds its pitch", () => {
    expect(classifyMotion(60, 60, 64, 67)).toBe("oblique");
    expect(classifyMotion(60, 62, 64, 64)).toBe("oblique");
  });

  test("contrary when the voices move in opposite directions", () => {
    expect(classifyMotion(60, 62, 67, 65)).toBe("contrary");
  });

  test("parallel when both voices move the same direction by the same amount", () => {
    expect(classifyMotion(60, 62, 67, 69)).toBe("parallel");
  });

  test("similar when both voices move the same direction by a different amount", () => {
    expect(classifyMotion(60, 62, 67, 71)).toBe("similar");
  });
});

describe("hasForbiddenParallelPerfect", () => {
  test("flags parallel motion between two perfect fifths", () => {
    // C4->D4 (cantus), G4->A4 (counterpoint): both perfect 5ths, parallel motion
    expect(hasForbiddenParallelPerfect(60, 62, 67, 69)).toBe(true);
  });

  test("does not flag a perfect fifth reached by contrary motion", () => {
    expect(hasForbiddenParallelPerfect(60, 62, 67, 65)).toBe(false);
  });

  test("does not flag consecutive imperfect consonances", () => {
    expect(hasForbiddenParallelPerfect(60, 62, 64, 66)).toBe(false);
  });
});

describe("crossesVoices", () => {
  test("detects a counterpoint-above voice dipping below the cantus firmus", () => {
    expect(crossesVoices(60, 58, true)).toBe(true);
    expect(crossesVoices(60, 67, true)).toBe(false);
  });

  test("detects a counterpoint-below voice rising above the cantus firmus", () => {
    expect(crossesVoices(60, 65, false)).toBe(true);
    expect(crossesVoices(60, 55, false)).toBe(false);
  });
});
