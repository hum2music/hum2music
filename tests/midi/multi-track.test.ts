import { describe, expect, test } from "bun:test";
import { writeMultiTrackMidiFile } from "@hum2music/midi";

function readAscii(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

describe("writeMultiTrackMidiFile", () => {
  test("writes one tempo track plus one track per entry, in order", () => {
    const bytes = writeMultiTrackMidiFile(
      [
        { notes: [{ pitch: 60, startMs: 0, durationMs: 500, velocity: 100 }] },
        { notes: [{ pitch: 48, startMs: 0, durationMs: 500, velocity: 90 }], channel: 2, programNumber: 32 },
        { notes: [{ pitch: 36, startMs: 0, durationMs: 100, velocity: 100 }], channel: 9 },
      ],
      { bpm: 120 },
    );
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(readAscii(view, 0, 4)).toBe("MThd");
    expect(view.getUint16(8, false)).toBe(1); // format 1
    expect(view.getUint16(10, false)).toBe(4); // tempo + 3 note tracks

    let offset = 14;
    const trackLabels: string[] = [];
    while (offset < bytes.length) {
      expect(readAscii(view, offset, 4)).toBe("MTrk");
      const length = view.getUint32(offset + 4, false);
      trackLabels.push("MTrk");
      offset += 8 + length;
    }
    expect(trackLabels).toHaveLength(4);
  });

  test("emits a Program Change event when programNumber is given", () => {
    const bytes = writeMultiTrackMidiFile([{ notes: [{ pitch: 48, startMs: 0, durationMs: 500, velocity: 90 }], channel: 2, programNumber: 32 }]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const track0Length = view.getUint32(14 + 4, false);
    const track1Offset = 14 + 8 + track0Length;
    const track1Length = view.getUint32(track1Offset + 4, false);
    const trackData = bytes.subarray(track1Offset + 8, track1Offset + 8 + track1Length);

    // delta 0, Program Change ch2, program 32
    expect(Array.from(trackData.subarray(0, 3))).toEqual([0x00, 0xc2, 32]);
  });

  test("omits the Program Change event when programNumber is not given", () => {
    const bytes = writeMultiTrackMidiFile([{ notes: [{ pitch: 36, startMs: 0, durationMs: 100, velocity: 100 }], channel: 9 }]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const track0Length = view.getUint32(14 + 4, false);
    const track1Offset = 14 + 8 + track0Length;
    const track1Length = view.getUint32(track1Offset + 4, false);
    const trackData = bytes.subarray(track1Offset + 8, track1Offset + 8 + track1Length);

    // delta 0, Note On ch9, pitch 36 — no 0xC9 program change before it.
    expect(Array.from(trackData.subarray(0, 4))).toEqual([0x00, 0x90 | 9, 36, 100]);
  });

  test("assigns channel by track index when channel is omitted", () => {
    const bytes = writeMultiTrackMidiFile([
      { notes: [{ pitch: 60, startMs: 0, durationMs: 100, velocity: 100 }] },
      { notes: [{ pitch: 48, startMs: 0, durationMs: 100, velocity: 100 }] },
    ]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const track0Length = view.getUint32(14 + 4, false);
    const track1Offset = 14 + 8 + track0Length;
    const track1Length = view.getUint32(track1Offset + 4, false);
    const track2Offset = track1Offset + 8 + track1Length;

    expect(bytes[track1Offset + 8 + 1]).toBe(0x90 | 0);
    expect(bytes[track2Offset + 8 + 1]).toBe(0x90 | 1);
  });
});
