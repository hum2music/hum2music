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
