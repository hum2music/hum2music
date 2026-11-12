import { midiNoteToFrequency } from "@hum2music/audio-analysis";
import { noteEventsToMidiNotes } from "@hum2music/midi";
import type { AudioRenderer, Hum2MusicPlugin } from "@hum2music/plugin-api";
import { classifyDrumNote, renderToSamples, type DrumRenderNote, type PitchedRenderNote, type Timbre } from "@hum2music/rendering";

const DEFAULT_SAMPLE_RATE = 44100;

/** Known instrument IDs this renderer gives a distinct timbre to. */
const INSTRUMENT_TIMBRES: Partial<Record<string, Timbre>> = {
  melody: "melody",
  piano: "piano",
  bass: "bass",
  guitar: "guitar",
  violin: "violin",
  viola: "viola",
  cello: "cello",
};

/**
 * Never silently substitutes a timbre for an unmapped instrument (PRD
 * UPDATE_PRD.md §6.4): falls back to "melody" but always warns so the
 * substitution is visible, rather than quietly changing the sound.
 */
const FALLBACK_TIMBRE: Timbre = "melody";

export const builtinSynthRenderer: AudioRenderer = {
  id: "builtin-synth",
  async render(composition, options) {
    const pitchedNotes: PitchedRenderNote[] = [];
    const drumNotes: DrumRenderNote[] = [];

    for (const track of composition.tracks) {
      const midiNotes = noteEventsToMidiNotes(track.notes, composition.metadata.bpm);

      if (track.instrumentId === "drums") {
        for (const note of midiNotes) {
          drumNotes.push({
            startMs: note.startMs,
            durationMs: note.durationMs,
            velocity: note.velocity,
            drumType: classifyDrumNote(note.pitch),
          });
        }
        continue;
      }

      let timbre = INSTRUMENT_TIMBRES[track.instrumentId];
      if (!timbre) {
        console.warn(
          `[renderer-builtin-synth] No timbre mapped for instrument "${track.instrumentId}"; falling back to "${FALLBACK_TIMBRE}".`,
        );
        timbre = FALLBACK_TIMBRE;
      }

      for (const note of midiNotes) {
        pitchedNotes.push({
          startMs: note.startMs,
          durationMs: note.durationMs,
          velocity: note.velocity,
          frequencyHz: midiNoteToFrequency(note.pitch),
          timbre,
        });
      }
    }

    const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    const samples = renderToSamples(pitchedNotes, drumNotes, { sampleRate, seed: options.seed });
    return { sampleRate, channels: 1, samples: [samples] };
  },
};

/**
 * Compatibility wrapper registering the existing (pre-plugin-system)
 * additive synth from @hum2music/rendering under the new Renderer Plugin
 * API, per UPDATE_PRD.md §6.3 "Built-in Synth" / §12 "Phase 2".
 */
export const builtinSynthRendererPlugin: Hum2MusicPlugin = {
  id: "@hum2music/renderer-builtin-synth",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.renderers.register(builtinSynthRenderer);
  },
};
