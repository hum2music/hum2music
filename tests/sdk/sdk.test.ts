import { describe, expect, test } from "bun:test";
import { pianoInstrumentPlugin } from "@hum2music/instrument-piano";
import { violinInstrumentPlugin } from "@hum2music/instrument-violin";
import type { ChordEvent } from "@hum2music/core";
import { builtinSynthRendererPlugin } from "@hum2music/renderer-builtin-synth";
import { createHum2Music } from "@hum2music/sdk";
import { popBalladStylePlugin } from "@hum2music/style-pop-ballad";

const CHORDS: ChordEvent[] = [
  { symbol: "C", startBeat: 0, durationBeats: 4, confidence: 1 },
  { symbol: "G", startBeat: 4, durationBeats: 4, confidence: 1 },
  { symbol: "Am", startBeat: 8, durationBeats: 4, confidence: 1 },
  { symbol: "F", startBeat: 12, durationBeats: 4, confidence: 1 },
];

describe("createHum2Music", () => {
  test("composes tracks for every requested instrument using the registered arrangers", async () => {
    const app = createHum2Music();
    await app.use(pianoInstrumentPlugin);
    await app.use(violinInstrumentPlugin);

    const composition = await app.compose({ melody: [], chords: CHORDS, bpm: 120, instruments: ["piano", "violin"] });

    expect(composition.tracks.map((t) => t.instrumentId)).toEqual(["piano", "violin"]);
    expect(composition.tracks[0].notes.length).toBeGreaterThan(0);
    expect(composition.tracks[1].notes.length).toBe(CHORDS.length);
    expect(composition.metadata.bpm).toBe(120);
  });

  test("passes earlier tracks to later arrangers via otherTracks", async () => {
    const app = createHum2Music();
    await app.use(pianoInstrumentPlugin);
    await app.use({
      id: "@test/instrument-probe",
      version: "0.1.0",
      apiVersion: "1.0.0",
      register(context) {
        context.instruments.register({ id: "probe", name: "Probe", family: "other", polyphony: 1 });
        context.arrangers.register({
          id: "@test/probe-arranger",
          instrumentId: "probe",
          async arrange(arrangementContext) {
            expect(arrangementContext.otherTracks.has("piano")).toBe(true);
            return [];
          },
        });
      },
    });

    await app.compose({ melody: [], chords: CHORDS, bpm: 120, instruments: ["piano", "probe"] });
  });

  test("throws a clear error for a requested instrument with no registered definition", async () => {
    const app = createHum2Music();
    await expect(app.compose({ melody: [], chords: CHORDS, bpm: 120, instruments: ["cello"] })).rejects.toThrow(
      /No InstrumentDefinition registered/,
    );
  });

  test("resolves a registered style and passes it to each arranger", async () => {
    const app = createHum2Music();
    await app.use(pianoInstrumentPlugin);
    await app.use(popBalladStylePlugin);

    const block = await app.compose({ melody: [], chords: CHORDS, bpm: 120, instruments: ["piano"], style: "pop" });
    const arpeggio = await app.compose({ melody: [], chords: CHORDS, bpm: 120, instruments: ["piano"], style: "ballad" });

    // Pop uses a block-chord pattern, Ballad an arpeggio (and allows the 9th)
    // — different enough that note counts should differ.
    expect(block.tracks[0].notes.length).not.toBe(arpeggio.tracks[0].notes.length);
  });

  test("getStyle looks up a registered style's full definition", async () => {
    const app = createHum2Music();
    await app.use(popBalladStylePlugin);
    expect(app.getStyle("pop")?.rhythm?.drumDensity).toBe("normal");
    expect(app.getStyle("unknown")).toBeUndefined();
  });

  test("throws a clear error for an unregistered style id", async () => {
    const app = createHum2Music();
    await app.use(pianoInstrumentPlugin);
    await expect(
      app.compose({ melody: [], chords: CHORDS, bpm: 120, instruments: ["piano"], style: "classical" }),
    ).rejects.toThrow(/No StyleDefinition registered/);
  });

  test("renders a composition through a registered AudioRenderer", async () => {
    const app = createHum2Music();
    await app.use(pianoInstrumentPlugin);
    await app.use(builtinSynthRendererPlugin);

    const composition = await app.compose({ melody: [], chords: CHORDS, bpm: 120, instruments: ["piano"] });
    const audio = await app.render(composition, "builtin-synth", { sampleRate: 44100 });

    expect(audio.sampleRate).toBe(44100);
    const peak = Math.max(...Array.from(audio.samples[0]).map(Math.abs));
    expect(peak).toBeGreaterThan(0);
  });

  test("is deterministic end-to-end for the same seed", async () => {
    const buildApp = async () => {
      const app = createHum2Music();
      await app.use(pianoInstrumentPlugin);
      await app.use(violinInstrumentPlugin);
      await app.use(builtinSynthRendererPlugin);
      return app;
    };

    const run = async () => {
      const app = await buildApp();
      const composition = await app.compose({
        melody: [],
        chords: CHORDS,
        bpm: 120,
        instruments: ["piano", "violin"],
        seed: 99,
      });
      return app.render(composition, "builtin-synth", { seed: 99 });
    };

    const a = await run();
    const b = await run();
    expect(Array.from(b.samples[0])).toEqual(Array.from(a.samples[0]));
  });
});
