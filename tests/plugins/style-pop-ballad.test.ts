import { describe, expect, test } from "bun:test";
import { popBalladStylePlugin } from "@hum2music/style-pop-ballad";
import { createTestContext } from "@hum2music/testing";

describe("popBalladStylePlugin", () => {
  test("registers both pop and ballad styles with the legacy profile's values", () => {
    const context = createTestContext();
    popBalladStylePlugin.register(context);

    const pop = context.styles.get("pop");
    const ballad = context.styles.get("ballad");
    expect(pop).toBeDefined();
    expect(ballad).toBeDefined();

    expect(pop!.rhythm?.drumDensity).toBe("normal");
    expect(pop!.orchestration?.pianoPattern).toBe("block");
    expect(ballad!.rhythm?.drumDensity).toBe("sparse");
    expect(ballad!.orchestration?.pianoPattern).toBe("arpeggio");
    expect(ballad!.orchestration?.pianoAllowExtensions).toBe(true);
  });
});
