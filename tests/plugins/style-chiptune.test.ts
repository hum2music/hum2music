import { describe, expect, test } from "bun:test";
import { chiptuneStylePlugin } from "@hum2music/style-chiptune";
import { createTestContext } from "@hum2music/testing";

describe("chiptuneStylePlugin", () => {
  test("registers a mechanically precise, melody-led style", () => {
    const context = createTestContext();
    chiptuneStylePlugin.register(context);

    const chiptune = context.styles.get("chiptune");
    expect(chiptune).toBeDefined();
    expect(chiptune!.expression?.humanizeMultiplier).toBe(0);
    expect(chiptune!.orchestration?.pianoPattern).toBe("arpeggio");
    expect(chiptune!.harmony?.progressionWeights?.melodyFit).toBeGreaterThan(0.5);
    expect(chiptune!.defaultInstruments).toEqual(["piano", "bass", "drums"]);
  });

  test("overrides piano/bass GM program numbers toward synth lead/bass patches", () => {
    const context = createTestContext();
    chiptuneStylePlugin.register(context);
    expect(context.styles.get("chiptune")!.orchestration?.programNumbers).toEqual({ piano: 80, bass: 38 });
  });
});
