export interface DecodedAudio {
  sampleRate: number;
  samples: Float32Array;
}

export function decodeWav(buffer: ArrayBuffer): DecodedAudio {
  const view = new DataView(buffer);

  if (readAscii(view, 0, 4) !== "RIFF") throw new Error("Not a RIFF file");
  if (readAscii(view, 8, 4) !== "WAVE") throw new Error("Not a WAVE file");

  let offset = 12;
  let fmt: { audioFormat: number; numChannels: number; sampleRate: number; bitsPerSample: number } | null = null;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (chunkId === "fmt ") {
      fmt = {
        audioFormat: view.getUint16(chunkStart, true),
        numChannels: view.getUint16(chunkStart + 2, true),
        sampleRate: view.getUint32(chunkStart + 4, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true),
      };
    } else if (chunkId === "data") {
      dataOffset = chunkStart;
      dataLength = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!fmt) throw new Error("Malformed WAV file: missing fmt chunk");
  if (dataOffset < 0) throw new Error("Malformed WAV file: missing data chunk");
  if (fmt.audioFormat !== 1) {
    throw new Error(`Unsupported WAV encoding (audioFormat=${fmt.audioFormat}); only PCM is supported`);
  }
  if (fmt.bitsPerSample !== 16) {
    throw new Error(`Unsupported bit depth (${fmt.bitsPerSample}-bit); only 16-bit PCM is supported`);
  }

  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameCount = Math.floor(dataLength / (bytesPerSample * fmt.numChannels));
  const mono = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let channel = 0; channel < fmt.numChannels; channel++) {
      const sampleOffset = dataOffset + (i * fmt.numChannels + channel) * bytesPerSample;
      sum += view.getInt16(sampleOffset, true) / 32768;
    }
    mono[i] = sum / fmt.numChannels;
  }

  return { sampleRate: fmt.sampleRate, samples: mono };
}

function readAscii(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

/** Counterpart to decodeWav: encodes mono samples as a 16-bit PCM WAV file. */
export function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
