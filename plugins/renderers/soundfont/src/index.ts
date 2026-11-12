import { noteEventsToMidiNotes } from "@hum2music/midi";
import type { AudioBufferData, AudioRenderer, Hum2MusicPlugin, RenderOptions } from "@hum2music/plugin-api";
import { parseSoundFont, renderSoundFontNote, type SoundFont2 } from "@hum2music/soundfont";

const DEFAULT_SAMPLE_RATE = 44100;
/** Extra room past the last note's own duration, since each rendered note already includes its own short release tail (see @hum2music/soundfont's render.ts) - this just guards against rounding. */
const TAIL_MS = 200;
/** GM bank 128 is the percussion bank in every GM-compliant SoundFont; percussion patches don't vary by preset number the way melodic instruments do, so this project's single "drums" instrument always maps to bank 128, preset 0 (the standard kit). */
const PERCUSSION_BANK = 128;

/** Instrument ID -> GM program number, used when `options.instrumentPresets` doesn't override it - same convention as this project's other GM program number tables (e.g. apps/cli/src/commands/compose.ts's CHANNELS). */
const DEFAULT_GM_PROGRAMS: Record<string, number> = {
  melody: 0,
  piano: 0,
  bass: 33,
  guitar: 29,
  violin: 40,
  viola: 41,
  cello: 42,
};

export const soundFontRenderer: AudioRenderer = {
  id: "soundfont",
  async render(composition, options) {
    if (!options.soundFontData) {
      throw new Error('"soundfont" renderer requires RenderOptions.soundFontData (an in-memory .sf2 file).');
    }
    const soundFont = parseSoundFont(options.soundFontData);
    const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;

    type MixEvent = { startSample: number; left: Float32Array; right: Float32Array };
    const mixEvents: MixEvent[] = [];
    let totalSamples = 0;

    for (const track of composition.tracks) {
      const { programNumber, bank } = resolveProgram(track.instrumentId, options);
      const midiNotes = noteEventsToMidiNotes(track.notes, composition.metadata.bpm);

      for (const note of midiNotes) {
        const rendered = renderSoundFontNote(
          soundFont,
          programNumber,
          bank,
          { pitch: note.pitch, velocity: note.velocity, startMs: note.startMs, durationMs: note.durationMs },
          sampleRate,
        );
        if (!rendered) {
          console.warn(
            `[renderer-soundfont] No preset/instrument zone covers instrument "${track.instrumentId}" (program ${programNumber}, bank ${bank}) at pitch ${note.pitch}, velocity ${note.velocity}; skipping this note (silence).`,
          );
          continue;
        }

        const startSample = Math.max(0, Math.round((note.startMs / 1000) * sampleRate));
        mixEvents.push({ startSample, left: rendered.left, right: rendered.right });
        totalSamples = Math.max(totalSamples, startSample + rendered.left.length);
      }
    }

    totalSamples += Math.round((TAIL_MS / 1000) * sampleRate);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    for (const event of mixEvents) {
      mixInto(left, event.left, event.startSample);
      mixInto(right, event.right, event.startSample);
    }
    normalizeInPlace(left);
    normalizeInPlace(right);

    return { sampleRate, channels: 2, samples: [left, right] } satisfies AudioBufferData;
  },
};

function resolveProgram(instrumentId: string, options: RenderOptions): { programNumber: number; bank: number } {
  if (instrumentId === "drums") return { programNumber: 0, bank: PERCUSSION_BANK };

  const overridden = options.instrumentPresets?.[instrumentId];
  if (overridden !== undefined) {
    const parsed = Number(overridden);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 127) return { programNumber: parsed, bank: 0 };
    console.warn(`[renderer-soundfont] instrumentPresets["${instrumentId}"] = "${overridden}" isn't a valid GM program number (0-127); ignoring it.`);
  }

  const fallback = DEFAULT_GM_PROGRAMS[instrumentId];
  if (fallback === undefined) {
    console.warn(`[renderer-soundfont] No GM program mapped for instrument "${instrumentId}"; falling back to program 0 (piano).`);
    return { programNumber: 0, bank: 0 };
  }
  return { programNumber: fallback, bank: 0 };
}

function mixInto(output: Float32Array, source: Float32Array, startSample: number): void {
  for (let i = 0; i < source.length; i++) {
    const index = startSample + i;
    if (index >= output.length) break;
    output[index] += source[i];
  }
}

function normalizeInPlace(buffer: Float32Array): void {
  let peak = 0;
  for (const value of buffer) peak = Math.max(peak, Math.abs(value));
  if (peak <= 1) return;
  for (let i = 0; i < buffer.length; i++) buffer[i] /= peak;
}

export type { SoundFont2 };

/**
 * SoundFont Renderer (PRD UPDATE_PRD.md §6.3): plays real sample data
 * from an in-memory .sf2 file instead of synthesizing, selecting the
 * GM-mapped preset per instrument, the right zone by key/velocity, and
 * applying pitch-shifting/pan/attenuation/looped-sustain/basic release
 * (see @hum2music/soundfont's render.ts doc comment for the exact
 * scope — no modulators/envelope-generator ADSR/LFOs/filters).
 */
export const soundFontRendererPlugin: Hum2MusicPlugin = {
  id: "@hum2music/renderer-soundfont",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.renderers.register(soundFontRenderer);
  },
};
