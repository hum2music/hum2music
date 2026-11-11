import type { ChordEvent, KeyCandidate, NoteEvent, TempoCandidate } from "@hum2music/core";
import { groupNotesIntoBars } from "./bars";
import { estimateKey } from "./key-estimation";
import { quantizeToBeats } from "./quantize";
import { searchChordProgression } from "./progression-search";
import { estimateTempo } from "./tempo";
import type { TimedNote } from "./timed-note";

export interface HarmonyAnalysis {
  tempoCandidates: TempoCandidate[];
  selectedBpm: number;
  keyCandidates: KeyCandidate[];
  melody: NoteEvent[];
  chords: ChordEvent[];
}

/** Phase 1 pipeline: timed notes -> tempo/key candidates -> quantized melody -> chord progression. */
export function analyzeHarmony(notes: TimedNote[], overrideBpm?: number): HarmonyAnalysis {
  const tempoCandidates = estimateTempo(notes);
  const selectedBpm = overrideBpm ?? tempoCandidates[0]?.bpm ?? 120;

  const melody = quantizeToBeats(notes, selectedBpm);
  const keyCandidates = estimateKey(notes);
  const bars = groupNotesIntoBars(melody);
  const chords = searchChordProgression(bars, keyCandidates[0]);

  return { tempoCandidates, selectedBpm, keyCandidates, melody, chords };
}
