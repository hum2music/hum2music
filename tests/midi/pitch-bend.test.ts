import { describe, expect, test } from "bun:test";
import { writeStandardMidiFile } from "@hum2music/midi";

function readTrack1Bytes(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const track0Length = view.getUint32(14 + 4, false);
  const track1Offset = 14 + 8 + track0Length;
  const track1Length = view.getUint32(track1Offset + 4, false);
  return bytes.subarray(track1Offset + 8, track1Offset + 8 + track1Length);
}

describe("writeStandardMidiFile pitch bend", () => {
  test("emits a pitch bend event for each curve sample, then resets to center at note-off", () => {
    const bytes = writeStandardMidiFile([
      {
        pitch: 60,
        startMs: 0,
        durationMs: 500,
        velocity: 100,
        pitchCurve: [
          { offsetMs: 0, cents: 100 }, // max bend (+100 cents of a default 200-cent range) -> value 12288
          { offsetMs: 250, cents: -100 }, // value 4096
        ],
      },
    ]);
    const track = readTrack1Bytes(bytes);

    // Note On, then two pitch bends (0xE0), then Note Off, then a centering pitch bend.
    const pitchBendStatusCount = countStatusByte(track, 0xe0);
    expect(pitchBendStatusCount).toBe(3); // 2 curve samples + 1 reset-to-center

    const lastBendValue = lastPitchBendValue(track);
    expect(lastBendValue).toBe(8192); // centered reset
  });

  test("does not emit pitch bend events when a note has no pitch curve", () => {
    const bytes = writeStandardMidiFile([{ pitch: 60, startMs: 0, durationMs: 500, velocity: 100 }]);
    const track = readTrack1Bytes(bytes);
    expect(countStatusByte(track, 0xe0)).toBe(0);
  });
});

function countStatusByte(track: Uint8Array, statusByte: number): number {
  let count = 0;
  for (let i = 0; i < track.length; i++) {
    if (track[i] === statusByte) count++;
  }
  return count;
}

function lastPitchBendValue(track: Uint8Array): number {
  let lastValue = -1;
  for (let i = 0; i < track.length - 2; i++) {
    if (track[i] === 0xe0) {
      lastValue = track[i + 1] | (track[i + 2] << 7);
    }
  }
  return lastValue;
}
