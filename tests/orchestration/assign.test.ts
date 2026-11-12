import { describe, expect, test } from "bun:test";
import type { InstrumentDefinition } from "@hum2music/plugin-api";
import { assignRoles } from "@hum2music/orchestration";

const PIANO: InstrumentDefinition = { id: "piano", name: "Piano", family: "keyboard", pitchRange: { min: 21, max: 108 }, polyphony: 10 };
const VIOLIN: InstrumentDefinition = { id: "violin", name: "Violin", family: "strings", pitchRange: { min: 55, max: 103 }, polyphony: 1 };
const VIOLA: InstrumentDefinition = { id: "viola", name: "Viola", family: "strings", pitchRange: { min: 48, max: 91 }, polyphony: 1 };
const CELLO: InstrumentDefinition = { id: "cello", name: "Cello", family: "strings", pitchRange: { min: 36, max: 76 }, polyphony: 1 };
const DRUMS: InstrumentDefinition = { id: "drums", name: "Drums", family: "percussion", polyphony: 4 };

describe("assignRoles", () => {
  test("returns an empty assignment for an empty ensemble", () => {
    expect(assignRoles([], { min: 60, max: 72 })).toEqual([]);
  });

  test("assigns melody to the instrument whose range best covers the melody's register", () => {
    // A melody around middle C / up an octave sits squarely in the violin's range, not the cello's.
    const assignments = assignRoles([VIOLIN, VIOLA, CELLO], { min: 60, max: 79 });
    expect(assignments.find((a) => a.role === "melody")?.instrumentId).toBe("violin");
  });

  test("assigns bass to the lowest-registered remaining instrument", () => {
    const assignments = assignRoles([VIOLIN, VIOLA, CELLO], { min: 60, max: 79 });
    expect(assignments.find((a) => a.role === "bass")?.instrumentId).toBe("cello");
  });

  test("assigns harmony to a polyphonic instrument and countermelody to monophonic ones", () => {
    const assignments = assignRoles([PIANO, VIOLIN, VIOLA, CELLO], { min: 60, max: 79 });
    expect(assignments.find((a) => a.instrumentId === "piano")?.role).toBe("harmony");
    expect(assignments.find((a) => a.instrumentId === "viola")?.role).toBe("countermelody");
  });

  test("never assigns melody to a non-pitched instrument", () => {
    const assignments = assignRoles([DRUMS, VIOLIN], { min: 60, max: 79 });
    expect(assignments.find((a) => a.role === "melody")?.instrumentId).toBe("violin");
  });

  test("gives every instrument exactly one role", () => {
    const ensemble = [PIANO, VIOLIN, VIOLA, CELLO, DRUMS];
    const assignments = assignRoles(ensemble, { min: 60, max: 79 });
    expect(assignments).toHaveLength(ensemble.length);
    expect(new Set(assignments.map((a) => a.instrumentId)).size).toBe(ensemble.length);
  });
});
