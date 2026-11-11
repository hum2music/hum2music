import type { NoteCandidate, PitchFrame } from "@hum2music/core";
import { frequencyToMidiNote } from "./pitch-to-midi";

export interface SegmentationOptions {
  hopMs: number;
  pitchJumpCents?: number;
  minVoicedFrames?: number;
}

/**
 * Groups a cleaned pitch trajectory into note candidates. A run of voiced
 * frames stays one note as long as it doesn't jump more than
 * `pitchJumpCents` away from the running average of the current note;
 * unvoiced frames (rests) always end the current note.
 */
export function segmentNotes(frames: PitchFrame[], options: SegmentationOptions): NoteCandidate[] {
  const pitchJumpCents = options.pitchJumpCents ?? 50;
  const minVoicedFrames = options.minVoicedFrames ?? 2;

  const candidates: NoteCandidate[] = [];
  let current: PitchFrame[] = [];
  let midiSum = 0;

  const flush = () => {
    if (current.length >= minVoicedFrames) {
      candidates.push(buildCandidate(current, options.hopMs));
    }
    current = [];
    midiSum = 0;
  };

  for (const frame of frames) {
    if (!frame.voiced || frame.f0Hz === null) {
      flush();
      continue;
    }

    const midi = frequencyToMidiNote(frame.f0Hz);

    if (current.length > 0) {
      const runningAverage = midiSum / current.length;
      const centsDelta = (midi - runningAverage) * 100;
      if (Math.abs(centsDelta) > pitchJumpCents) flush();
    }

    current.push(frame);
    midiSum += midi;
  }
  flush();

  return candidates;
}

function buildCandidate(frames: PitchFrame[], hopMs: number): NoteCandidate {
  const startMs = frames[0].timeMs;
  const durationMs = frames[frames.length - 1].timeMs - startMs + hopMs;
  const midiValues = frames.map((frame) => frequencyToMidiNote(frame.f0Hz as number));
  const rawPitch = midiValues.reduce((sum, value) => sum + value, 0) / midiValues.length;
  const onsetConfidence = frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length;

  return { startMs, durationMs, rawPitch, pitchTrajectory: frames, onsetConfidence };
}
