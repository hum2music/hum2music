import { readFile, writeFile } from "node:fs/promises";

/**
 * Bun.file()/Bun.write() when running under Bun (the primary, tested
 * runtime for this CLI), falling back to node:fs/promises otherwise, so
 * the same source also runs under plain Node.js. Behavior under Bun is
 * unchanged from calling Bun's APIs directly.
 */
export async function readFileAsArrayBuffer(path: string): Promise<ArrayBuffer> {
  if (typeof Bun !== "undefined") return Bun.file(path).arrayBuffer();

  const buffer = await readFile(path);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function writeFileData(path: string, data: Uint8Array | ArrayBuffer | string): Promise<void> {
  if (typeof Bun !== "undefined") {
    await Bun.write(path, data);
    return;
  }

  if (typeof data === "string") {
    await writeFile(path, data, "utf8");
  } else {
    await writeFile(path, toBuffer(data));
  }
}

function toBuffer(data: Uint8Array | ArrayBuffer): Buffer {
  return data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}
