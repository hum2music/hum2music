import { describe, expect, test } from "bun:test";
import { defineConfig } from "@hum2music/sdk";

describe("defineConfig", () => {
  test("returns the config object unchanged (identity helper for type inference)", () => {
    const config = defineConfig({ plugins: ["@hum2music/instrument-violin"], defaultRenderer: "builtin-synth" });
    expect(config).toEqual({ plugins: ["@hum2music/instrument-violin"], defaultRenderer: "builtin-synth" });
  });

  test("works with no arguments given", () => {
    expect(defineConfig({})).toEqual({});
  });
});
