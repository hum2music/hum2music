import type { ChordEvent, KeyCandidate, NoteEvent, SongSection, TempoCandidate } from "@hum2music/core";
import { groupNotesIntoBars } from "./bars";
import { estimateKey } from "./key-estimation";
import { quantizeToBeats } from "./quantize";
import { searchChordProgression, type ProgressionSearchWeights } from "./progression-search";
import { estimateSongStructure } from "./song-structure";
import { estimateTempo } from "./tempo";
import type { TimedNote } from "./timed-note";

export interface HarmonyAnalysis {
  tempoCandidates: TempoCandidate[];
  selectedBpm: number;
  keyCandidates: KeyCandidate[];
  melody: NoteEvent[];
  chords: ChordEvent[];
  songSections: SongSection[];
}

export interface AnalyzeHarmonyOptions {
  overrideBpm?: number;
  progressionWeights?: ProgressionSearchWeights;
}

/** Harmony analysis pipeline: timed notes -> tempo/key candidates -> quantized melody -> chord progression -> song structure. */
export function analyzeHarmony(notes: TimedNote[], options: AnalyzeHarmonyOptions | number = {}): HarmonyAnalysis {
  const resolvedOptions: AnalyzeHarmonyOptions = typeof options === "number" ? { overrideBpm: options } : options;

  const tempoCandidates = estimateTempo(notes);
  const selectedBpm = resolvedOptions.overrideBpm ?? tempoCandidates[0]?.bpm ?? 120;

  const melody = quantizeToBeats(notes, selectedBpm);
  const keyCandidates = estimateKey(notes);
  const bars = groupNotesIntoBars(melody);
  const chords = searchChordProgression(bars, keyCandidates[0], resolvedOptions.progressionWeights);
  const songSections = estimateSongStructure(chords);

  return { tempoCandidates, selectedBpm, keyCandidates, melody, chords, songSections };
}
