import { describe, expect, test } from "bun:test";
import { classicalStylePlugin } from "@hum2music/style-classical";
import { createTestContext } from "@hum2music/testing";

describe("classicalStylePlugin", () => {
  test("registers a piano + string-trio chamber ensemble default", () => {
    const context = createTestContext();
    classicalStylePlugin.register(context);

    const classical = context.styles.get("classical");
    expect(classical).toBeDefined();
    expect(classical!.defaultInstruments).toEqual(["piano", "violin", "viola", "cello"]);
    expect(classical!.orchestration?.pianoPattern).toBe("arpeggio");
    expect(classical!.orchestration?.pianoAllowExtensions).toBe(true);
    expect(classical!.harmony?.progressionWeights).toBeDefined();
  });
});
