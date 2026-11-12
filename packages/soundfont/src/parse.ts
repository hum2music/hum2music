import type { SoundFont2, SoundFontInstrument, SoundFontPreset, SoundFontPresetZone, SoundFontSample, SoundFontZone } from "./types.ts";

/**
 * Parses a SoundFont2 (.sf2) file's RIFF structure into a flat,
 * queryable `SoundFont2` (PRD UPDATE_PRD.md §6.3's SoundFont Renderer).
 *
 * Scope: this reads exactly the chunks/generators needed to pick the
 * right sample for a (program, key, velocity) and play it back pitch-
 * shifted, panned, and attenuated — `instrument`/`sampleID` zone
 * selection by keyRange/velRange, coarseTune/fineTune/pan/
 * initialAttenuation/sampleModes/overridingRootKey, including global
 * zones. It does NOT implement modulators (pmod/imod — skipped
 * entirely), the volume/modulation envelope generators (attack/hold/
 * decay/sustain/release — real ADSR shaping), LFOs, or filters: those
 * need a real-time synthesis engine, not just sample playback, and are
 * left for future work rather than faked. See render.ts for the actual
 * playback approximation these omissions imply (a simple linear
 * release fade standing in for the envelope release stage).
 */
export function parseSoundFont(buffer: ArrayBuffer): SoundFont2 {
  const view = new DataView(buffer);
  assertFourCC(view, 0, "RIFF");
  assertFourCC(view, 8, "sfbk");

  const topLevelChunks = readChunks(view, 12, 12 + view.getUint32(4, true) - 4);
  const sfbkLists = new Map(topLevelChunks.filter((c) => c.id === "LIST").map((c) => [readFourCC(view, c.dataStart), c]));

  const sdta = sfbkLists.get("sdta");
  const pdta = sfbkLists.get("pdta");
  if (!sdta || !pdta) throw new Error("Not a valid SoundFont2 file: missing sdta or pdta chunk");

  const smplChunk = readChunks(view, sdta.dataStart + 4, sdta.dataStart + sdta.size).find((c) => c.id === "smpl");
  if (!smplChunk) throw new Error("Not a valid SoundFont2 file: sdta has no smpl chunk");
  const sampleData = new Int16Array(buffer.slice(smplChunk.dataStart, smplChunk.dataStart + smplChunk.size));

  const pdtaChunks = new Map(readChunks(view, pdta.dataStart + 4, pdta.dataStart + pdta.size).map((c) => [c.id, c]));
  const require = (id: string): Chunk => {
    const chunk = pdtaChunks.get(id);
    if (!chunk) throw new Error(`Not a valid SoundFont2 file: pdta is missing the "${id}" chunk`);
    return chunk;
  };

  const shdrRecords = readShdr(view, require("shdr"));
  const samples: SoundFontSample[] = shdrRecords.map((record) => ({
    name: record.name,
    data: sampleData.subarray(record.start, record.end),
    sampleRate: record.sampleRate,
    startLoop: Math.max(0, record.startLoop - record.start),
    endLoop: Math.max(0, record.endLoop - record.start),
    originalPitch: record.originalPitch,
    pitchCorrection: record.pitchCorrection,
  }));

  const ibagRecords = readBag(view, require("ibag"));
  const igenRecords = readGenList(view, require("igen"));
  const instRecords = readInst(view, require("inst"));
  const instruments: SoundFontInstrument[] = instRecords.slice(0, -1).map((record, index) => ({
    name: record.name,
    zones: zoneGeneratorsFor(instRecords, index, ibagRecords, igenRecords).flatMap(toInstrumentZone),
  }));

  const pbagRecords = readBag(view, require("pbag"));
  const pgenRecords = readGenList(view, require("pgen"));
  const phdrRecords = readPhdr(view, require("phdr"));
  const presets: SoundFontPreset[] = phdrRecords.slice(0, -1).map((record, index) => ({
    name: record.name,
    presetNumber: record.presetNumber,
    bank: record.bank,
    zones: zoneGeneratorsFor(phdrRecords, index, pbagRecords, pgenRecords).flatMap(toPresetZone),
  }));

  return { presets, instruments, samples };
}

const GEN_INSTRUMENT = 41;
const GEN_KEY_RANGE = 43;
const GEN_VEL_RANGE = 44;
const GEN_INITIAL_ATTENUATION = 48;
const GEN_COARSE_TUNE = 51;
const GEN_FINE_TUNE = 52;
const GEN_SAMPLE_ID = 53;
const GEN_SAMPLE_MODES = 54;
const GEN_OVERRIDING_ROOT_KEY = 58;
const GEN_PAN = 17;

interface RawGenerator {
  operator: number;
  /** Either a plain signed/unsigned amount, or {lo, hi} for the two range generators. */
  amount: number | { lo: number; hi: number };
}

interface BagRecord {
  genIndex: number;
}

interface HasBagIndex {
  bagIndex: number;
}

/**
 * Splits one preset's (or instrument's) generator records into one
 * array per zone, by bag-index range, then folds a leading "global
 * zone" (a zone with no terminal instrument/sampleID generator) in as
 * defaults for every other zone and drops it — exactly how SF2 global
 * zones work. `records` must include its own trailing terminal
 * (EOP/EOI) record, since `records[index + 1].bagIndex` is what bounds
 * the real record at `index`'s zones.
 */
function zoneGeneratorsFor(records: HasBagIndex[], index: number, bags: BagRecord[], generators: RawGenerator[]): RawGenerator[][] {
  const firstBagIndex = records[index].bagIndex;
  const afterLastBagIndex = records[index + 1].bagIndex;

  const zones: RawGenerator[][] = [];
  for (let bagIndex = firstBagIndex; bagIndex < afterLastBagIndex; bagIndex++) {
    const genStart = bags[bagIndex].genIndex;
    const genEnd = bagIndex + 1 < bags.length ? bags[bagIndex + 1].genIndex : generators.length;
    zones.push(generators.slice(genStart, genEnd));
  }
  return mergeGlobalZone(zones);
}

function mergeGlobalZone(zones: RawGenerator[][]): RawGenerator[][] {
  if (zones.length === 0) return zones;
  const isGlobal = (zone: RawGenerator[]) => !zone.some((g) => g.operator === GEN_INSTRUMENT || g.operator === GEN_SAMPLE_ID);
  if (!isGlobal(zones[0])) return zones;

  const globalGenerators = zones[0];
  return zones.slice(1).map((zone) => {
    const localOperators = new Set(zone.map((g) => g.operator));
    return [...globalGenerators.filter((g) => !localOperators.has(g.operator)), ...zone];
  });
}

function toInstrumentZone(generators: RawGenerator[]): SoundFontZone[] {
  const sampleIdGen = generators.find((g) => g.operator === GEN_SAMPLE_ID);
  if (!sampleIdGen || typeof sampleIdGen.amount !== "number") return []; // a global-only zone with no sample (nothing left to render)
  const read = generatorReader(generators);
  const keyRange = read.range(GEN_KEY_RANGE, 0, 127);
  const velRange = read.range(GEN_VEL_RANGE, 0, 127);

  return [
    {
      keyRangeLow: keyRange.lo,
      keyRangeHigh: keyRange.hi,
      velRangeLow: velRange.lo,
      velRangeHigh: velRange.hi,
      sampleIndex: sampleIdGen.amount,
      overridingRootKey: read.signedOrUndefined(GEN_OVERRIDING_ROOT_KEY),
      coarseTune: read.signed(GEN_COARSE_TUNE, 0),
      fineTune: read.signed(GEN_FINE_TUNE, 0),
      pan: read.signed(GEN_PAN, 0),
      initialAttenuation: read.signed(GEN_INITIAL_ATTENUATION, 0),
      sampleModes: normalizeSampleModes(read.signed(GEN_SAMPLE_MODES, 0)),
    },
  ];
}

function toPresetZone(generators: RawGenerator[]): SoundFontPresetZone[] {
  const instrumentGen = generators.find((g) => g.operator === GEN_INSTRUMENT);
  if (!instrumentGen || typeof instrumentGen.amount !== "number") return []; // a global-only zone with no instrument reference
  const read = generatorReader(generators);
  const keyRange = read.range(GEN_KEY_RANGE, 0, 127);
  const velRange = read.range(GEN_VEL_RANGE, 0, 127);

  return [
    {
      keyRangeLow: keyRange.lo,
      keyRangeHigh: keyRange.hi,
      velRangeLow: velRange.lo,
      velRangeHigh: velRange.hi,
      instrumentIndex: instrumentGen.amount,
    },
  ];
}

function normalizeSampleModes(value: number): 0 | 1 | 3 {
  return value === 1 ? 1 : value === 3 ? 3 : 0;
}

function generatorReader(generators: RawGenerator[]) {
  return {
    range(operator: number, defaultLo: number, defaultHi: number): { lo: number; hi: number } {
      const generator = generators.find((g) => g.operator === operator);
      if (!generator || typeof generator.amount === "number") return { lo: defaultLo, hi: defaultHi };
      return { lo: generator.amount.lo, hi: generator.amount.hi };
    },
    signed(operator: number, defaultValue: number): number {
      const generator = generators.find((g) => g.operator === operator);
      return generator && typeof generator.amount === "number" ? generator.amount : defaultValue;
    },
    signedOrUndefined(operator: number): number | undefined {
      const generator = generators.find((g) => g.operator === operator);
      if (!generator || typeof generator.amount !== "number") return undefined;
      return generator.amount === -1 ? undefined : generator.amount;
    },
  };
}

interface Chunk {
  id: string;
  dataStart: number;
  size: number;
}

function readChunks(view: DataView, start: number, end: number): Chunk[] {
  const chunks: Chunk[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    const id = readFourCC(view, offset);
    const size = view.getUint32(offset + 4, true);
    chunks.push({ id, dataStart: offset + 8, size });
    offset += 8 + size + (size % 2); // chunks are word-aligned; an odd-sized chunk has a pad byte
  }
  return chunks;
}

function readFourCC(view: DataView, offset: number): string {
  let text = "";
  for (let i = 0; i < 4; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

function assertFourCC(view: DataView, offset: number, expected: string): void {
  const actual = readFourCC(view, offset);
  if (actual !== expected) throw new Error(`Not a valid SoundFont2 file: expected "${expected}" at byte ${offset}, got "${actual}"`);
}

function readCString(view: DataView, offset: number, maxLength: number): string {
  let text = "";
  for (let i = 0; i < maxLength; i++) {
    const code = view.getUint8(offset + i);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text;
}

function readBag(view: DataView, chunk: Chunk): BagRecord[] {
  const count = chunk.size / 4;
  const records: BagRecord[] = [];
  for (let i = 0; i < count; i++) {
    records.push({ genIndex: view.getUint16(chunk.dataStart + i * 4, true) });
  }
  return records;
}

function readGenList(view: DataView, chunk: Chunk): RawGenerator[] {
  const count = chunk.size / 4;
  const records: RawGenerator[] = [];
  for (let i = 0; i < count; i++) {
    const offset = chunk.dataStart + i * 4;
    const operator = view.getUint16(offset, true);
    const amount =
      operator === GEN_KEY_RANGE || operator === GEN_VEL_RANGE
        ? { lo: view.getUint8(offset + 2), hi: view.getUint8(offset + 3) }
        : view.getInt16(offset + 2, true);
    records.push({ operator, amount });
  }
  return records;
}

interface InstRecord extends HasBagIndex {
  name: string;
}

function readInst(view: DataView, chunk: Chunk): InstRecord[] {
  const recordSize = 22;
  const count = chunk.size / recordSize;
  const records: InstRecord[] = [];
  for (let i = 0; i < count; i++) {
    const offset = chunk.dataStart + i * recordSize;
    records.push({ name: readCString(view, offset, 20), bagIndex: view.getUint16(offset + 20, true) });
  }
  return records;
}

interface PhdrRecord extends HasBagIndex {
  name: string;
  presetNumber: number;
  bank: number;
}

function readPhdr(view: DataView, chunk: Chunk): PhdrRecord[] {
  const recordSize = 38;
  const count = chunk.size / recordSize;
  const records: PhdrRecord[] = [];
  for (let i = 0; i < count; i++) {
    const offset = chunk.dataStart + i * recordSize;
    records.push({
      name: readCString(view, offset, 20),
      presetNumber: view.getUint16(offset + 20, true),
      bank: view.getUint16(offset + 22, true),
      bagIndex: view.getUint16(offset + 24, true),
    });
  }
  return records;
}

interface ShdrRecord {
  name: string;
  start: number;
  end: number;
  startLoop: number;
  endLoop: number;
  sampleRate: number;
  originalPitch: number;
  pitchCorrection: number;
}

function readShdr(view: DataView, chunk: Chunk): ShdrRecord[] {
  const recordSize = 46;
  // The terminal "EOS" record is a sentinel, not a real sample - exclude it.
  // (Nothing references it by index, so dropping it from the end doesn't
  // shift any real sample indices used elsewhere.)
  const count = chunk.size / recordSize - 1;
  const records: ShdrRecord[] = [];
  for (let i = 0; i < count; i++) {
    const offset = chunk.dataStart + i * recordSize;
    records.push({
      name: readCString(view, offset, 20),
      start: view.getUint32(offset + 20, true),
      end: view.getUint32(offset + 24, true),
      startLoop: view.getUint32(offset + 28, true),
      endLoop: view.getUint32(offset + 32, true),
      sampleRate: view.getUint32(offset + 36, true),
      originalPitch: view.getUint8(offset + 40),
      pitchCorrection: view.getInt8(offset + 41),
    });
  }
  return records;
}
