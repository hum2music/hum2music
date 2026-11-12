import { describe, expect, test } from "bun:test";
import { createTestContext, expectDeterministic, validateInstrument } from "@hum2music/testing";

describe("createTestContext", () => {
  test("returns a fresh, empty PluginContext", () => {
    const context = createTestContext();
    expect(context.instruments.list()).toEqual([]);
    context.instruments.register({ id: "piano", name: "Piano", family: "keyboard", polyphony: 10 });
    expect(context.instruments.has("piano")).toBe(true);
  });
});

describe("validateInstrument", () => {
  test("accepts a well-formed definition", () => {
    expect(
      validateInstrument({
        id: "violin",
        name: "Violin",
        family: "strings",
        pitchRange: { min: 55, max: 103 },
        polyphony: 1,
        midi: { program: 40 },
      }),
    ).toEqual([]);
  });

  test("reports every violated rule", () => {
    const errors = validateInstrument({
      id: "",
      name: "",
      family: "strings",
      pitchRange: { min: 80, max: 40 },
      polyphony: 0,
      midi: { program: 200 },
    });
    expect(errors).toContain("instrument id is required");
    expect(errors).toContain("instrument name is required");
    expect(errors).toContain("polyphony must be an integer >= 1");
    expect(errors).toContain("pitchRange.min must be <= pitchRange.max");
    expect(errors).toContain("midi.program must be between 0 and 127");
  });
});

describe("expectDeterministic", () => {
  test("passes for a pure function", async () => {
    await expectDeterministic(() => ({ pitch: 60, velocity: 80 }));
  });

  test("throws for a function with non-deterministic output", async () => {
    let call = 0;
    await expect(expectDeterministic(() => ({ call: call++ }))).rejects.toThrow(/differed/);
  });

  test("requires at least 2 runs", async () => {
    await expect(expectDeterministic(() => 1, 1)).rejects.toThrow(/at least 2 runs/);
  });
});
