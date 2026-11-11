import { describe, expect, test } from "bun:test";
import { writeStandardMidiFile } from "@hum2music/midi";

describe("writeStandardMidiFile", () => {
  test("produces a well-formed format-1 SMF with a tempo and a melody track", () => {
    const bytes = writeStandardMidiFile([
      { pitch: 60, startMs: 0, durationMs: 300, velocity: 100 },
      { pitch: 62, startMs: 300, durationMs: 300, velocity: 100 },
    ]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(readAscii(view, 0, 4)).toBe("MThd");
    expect(view.getUint32(4, false)).toBe(6);
    expect(view.getUint16(8, false)).toBe(1); // format 1
    expect(view.getUint16(10, false)).toBe(2); // tempo track + melody track
    const ppq = view.getUint16(12, false);
    expect(ppq).toBe(480);

    const track0Offset = 14;
    expect(readAscii(view, track0Offset, 4)).toBe("MTrk");
    const track0Length = view.getUint32(track0Offset + 4, false);

    const track1Offset = track0Offset + 8 + track0Length;
    expect(readAscii(view, track1Offset, 4)).toBe("MTrk");
  });

  test("encodes note on/off events with correct tick spacing for the default 120 BPM", () => {
    // 500ms at 120 BPM (500ms/quarter) is exactly one quarter note, i.e. `ppq` (480) ticks.
    const bytes = writeStandardMidiFile([{ pitch: 60, startMs: 0, durationMs: 500, velocity: 100 }]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const track0Length = view.getUint32(14 + 4, false);
    const track1Offset = 14 + 8 + track0Length;
    const track1Length = view.getUint32(track1Offset + 4, false);
    const trackData = bytes.subarray(track1Offset + 8, track1Offset + 8 + track1Length);

    // delta 0, Note On ch0, pitch 60, velocity 100
    expect(Array.from(trackData.subarray(0, 4))).toEqual([0x00, 0x90, 60, 100]);
    // delta 480 ticks as a 2-byte VLQ (0x83 0x60), then Note Off ch0, pitch 60, velocity 0
    expect(Array.from(trackData.subarray(4, 9))).toEqual([0x83, 0x60, 0x80, 60, 0]);
  });

  test("rejects a note with negative duration gracefully (end tick clamped after start)", () => {
    const bytes = writeStandardMidiFile([{ pitch: 60, startMs: 100, durationMs: -50, velocity: 90 }]);
    expect(bytes.length).toBeGreaterThan(0);
  });

  test("clamps a note starting before time zero instead of throwing", () => {
    // Can happen when humanization timing jitter nudges the very first note earlier than tick 0.
    const bytes = writeStandardMidiFile([{ pitch: 60, startMs: -5, durationMs: 300, velocity: 90 }]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const track0Length = view.getUint32(14 + 4, false);
    const track1Offset = 14 + 8 + track0Length;
    const track1Length = view.getUint32(track1Offset + 4, false);
    const trackData = bytes.subarray(track1Offset + 8, track1Offset + 8 + track1Length);

    expect(Array.from(trackData.subarray(0, 4))).toEqual([0x00, 0x90, 60, 90]);
  });
});

function readAscii(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}
