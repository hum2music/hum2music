/**
 * Hand-builds a minimal, spec-valid SoundFont2 (.sf2) byte buffer for
 * tests — one preset -> one instrument -> one zone -> one sample,
 * including a terminal record in every bag-indexed chunk (phdr/pbag/
 * inst/ibag), exactly as the real format requires. There's no
 * freely-redistributable real-world .sf2 fixture to bundle with the
 * repo, so this plays the same role `fixtures/synth.ts`'s synthetic WAV
 * generators play for audio-analysis tests: a fully-controlled, known
 * ground truth to parse/render against and check byte-for-byte.
 */
export interface MinimalSf2Options {
  /** Raw mono PCM16 sample data. */
  sampleData: Int16Array;
  sampleRate?: number;
  originalPitch?: number;
  pitchCorrection?: number;
  startLoop?: number;
  endLoop?: number;
  /** SF2 sampleModes generator (0 = no loop, 1 = loop continuously, 3 = loop then play remainder on release). */
  sampleModes?: 0 | 1 | 3;
  programNumber?: number;
  bank?: number;
  pan?: number;
  initialAttenuation?: number;
}

export function buildMinimalSf2(options: MinimalSf2Options): ArrayBuffer {
  const sampleRate = options.sampleRate ?? 44100;
  const originalPitch = options.originalPitch ?? 60;
  const pitchCorrection = options.pitchCorrection ?? 0;
  const startLoop = options.startLoop ?? 0;
  const endLoop = options.endLoop ?? options.sampleData.length;
  const sampleModes = options.sampleModes ?? 0;
  const programNumber = options.programNumber ?? 0;
  const bank = options.bank ?? 0;
  const pan = options.pan ?? 0;
  const initialAttenuation = options.initialAttenuation ?? 0;

  const info = chunk("LIST", concat([fourCC("INFO"), chunk("ifil", u16u16(2, 1)), chunk("isng", cstring("EMU8000"))]));

  const smpl = chunk("smpl", new Uint8Array(options.sampleData.buffer, options.sampleData.byteOffset, options.sampleData.byteLength));
  const sdta = chunk("LIST", concat([fourCC("sdta"), smpl]));

  const phdr = chunk(
    "phdr",
    concat([
      phdrRecord("TestPreset", programNumber, bank, 0),
      phdrRecord("EOP", 0, 0, 1),
    ]),
  );
  const pbag = chunk("pbag", concat([bagRecord(0, 0), bagRecord(1, 0)]));
  const pgen = chunk("pgen", concat([genRecord(GEN_INSTRUMENT, 0), genRecord(0, 0)]));

  const instGenerators = concat([
    rangeGenRecord(GEN_KEY_RANGE, 0, 127),
    rangeGenRecord(GEN_VEL_RANGE, 0, 127),
    genRecord(GEN_SAMPLE_MODES, sampleModes),
    genRecord(GEN_PAN, pan),
    genRecord(GEN_INITIAL_ATTENUATION, initialAttenuation),
    genRecord(GEN_SAMPLE_ID, 0),
  ]);
  const instGeneratorCount = 6;

  const inst = chunk("inst", concat([instRecord("TestInstrument", 0), instRecord("EOI", 1)]));
  const ibag = chunk("ibag", concat([bagRecord(0, 0), bagRecord(instGeneratorCount, 0)]));
  const igen = chunk("igen", concat([instGenerators, genRecord(0, 0)]));

  const shdr = chunk(
    "shdr",
    concat([
      shdrRecord("TestSample", 0, options.sampleData.length, startLoop, endLoop, sampleRate, originalPitch, pitchCorrection),
      shdrRecord("EOS", 0, 0, 0, 0, 0, 0, 0),
    ]),
  );

  const pdta = chunk("LIST", concat([fourCC("pdta"), phdr, pbag, pgen, inst, ibag, igen, shdr]));

  const sfbk = concat([fourCC("sfbk"), info, sdta, pdta]);
  const riff = chunk("RIFF", sfbk);
  return riff.buffer.slice(riff.byteOffset, riff.byteOffset + riff.byteLength) as ArrayBuffer;
}

const GEN_INSTRUMENT = 41;
const GEN_KEY_RANGE = 43;
const GEN_VEL_RANGE = 44;
const GEN_INITIAL_ATTENUATION = 48;
const GEN_SAMPLE_ID = 53;
const GEN_SAMPLE_MODES = 54;
const GEN_PAN = 17;

function chunk(id: string, data: Uint8Array): Uint8Array {
  const padded = data.length % 2 === 1 ? concat([data, new Uint8Array(1)]) : data;
  const header = new Uint8Array(8);
  new DataView(header.buffer).setUint32(4, data.length, true);
  header.set(fourCC(id), 0);
  return concat([header, padded]);
}

function fourCC(id: string): Uint8Array {
  return Uint8Array.from(id, (c) => c.charCodeAt(0));
}

function cstring(text: string, length = text.length + 1): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
}

function u16u16(a: number, b: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, a, true);
  view.setUint16(2, b, true);
  return bytes;
}

function bagRecord(genIndex: number, modIndex: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, genIndex, true);
  view.setUint16(2, modIndex, true);
  return bytes;
}

function genRecord(operator: number, amount: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, operator, true);
  view.setInt16(2, amount, true);
  return bytes;
}

function rangeGenRecord(operator: number, lo: number, hi: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, operator, true);
  view.setUint8(2, lo);
  view.setUint8(3, hi);
  return bytes;
}

function instRecord(name: string, bagIndex: number): Uint8Array {
  const bytes = new Uint8Array(22);
  bytes.set(cstring(name, 20), 0);
  new DataView(bytes.buffer).setUint16(20, bagIndex, true);
  return bytes;
}

function phdrRecord(name: string, presetNumber: number, bank: number, bagIndex: number): Uint8Array {
  const bytes = new Uint8Array(38);
  bytes.set(cstring(name, 20), 0);
  const view = new DataView(bytes.buffer);
  view.setUint16(20, presetNumber, true);
  view.setUint16(22, bank, true);
  view.setUint16(24, bagIndex, true);
  return bytes;
}

function shdrRecord(
  name: string,
  start: number,
  end: number,
  startLoop: number,
  endLoop: number,
  sampleRate: number,
  originalPitch: number,
  pitchCorrection: number,
): Uint8Array {
  const bytes = new Uint8Array(46);
  bytes.set(cstring(name, 20), 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(20, start, true);
  view.setUint32(24, end, true);
  view.setUint32(28, startLoop, true);
  view.setUint32(32, endLoop, true);
  view.setUint32(36, sampleRate, true);
  view.setUint8(40, originalPitch);
  view.setInt8(41, pitchCorrection);
  view.setUint16(42, 0, true); // wSampleLink (unused)
  view.setUint16(44, 1, true); // sfSampleType = monoSample
  return bytes;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}
