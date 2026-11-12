import { describe, expect, test } from "bun:test";
import { pianoSoloStylePlugin } from "@hum2music/style-piano-solo";
import { createTestContext } from "@hum2music/testing";

describe("pianoSoloStylePlugin", () => {
  test("registers a piano-only style with pianoIncludeMelody set", () => {
    const context = createTestContext();
    pianoSoloStylePlugin.register(context);

    const style = context.styles.get("piano-solo");
    expect(style).toBeDefined();
    expect(style!.defaultInstruments).toEqual(["piano"]);
    expect(style!.orchestration?.pianoIncludeMelody).toBe(true);
    expect(style!.orchestration?.pianoPattern).toBe("arpeggio");
    expect(style!.orchestration?.pianoAllowExtensions).toBe(true);
  });
});
