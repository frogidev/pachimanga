import { inflateSync } from 'fflate';

// Minimal zip reader: parses the central directory with DataView and
// inflates entries one at a time. fflate's unzipSync preallocates from
// central-directory sizes and throws RangeError on some valid archives
// in browser bundles, so backup parsing avoids it here.
const EOCD_SIG = 0x06054b50;
const EOCD64_LOCATOR_SIG = 0x07064b50;
const CD_SIG = 0x02014b50;
const ZIP64_EXTRA_TAG = 0x0001;
const MAX_ENTRY_BYTES = 256 * 1024 * 1024;

function u16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function u64(view: DataView, offset: number): number {
  const value = view.getBigUint64(offset, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('zip: entry too large');
  return Number(value);
}

function verifyOutputSize(name: string, output: Uint8Array, declaredUncompressedSize: number) {
  if (output.byteLength > MAX_ENTRY_BYTES) throw new Error(`zip: entry too large (${name})`);
  if (declaredUncompressedSize !== output.byteLength) {
    throw new Error(`zip: uncompressed size mismatch (${name})`);
  }
  return output;
}

export function unzipEntries(raw: Uint8Array): Record<string, Uint8Array> {
  try {
    return readCentralDirectory(raw);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('zip:')) throw error;
    throw new Error(`zip: unreadable archive (${error instanceof Error ? error.constructor.name : 'unknown'})`);
  }
}

function readCentralDirectory(raw: Uint8Array): Record<string, Uint8Array> {
  if (raw.length < 22) throw new Error('zip: too small');
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  let eocd = -1;
  for (let i = raw.length - 22; i >= Math.max(0, raw.length - 65557 - 22); i--) {
    if (u32(view, i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip: end-of-central-directory not found');
  let count = u16(view, eocd + 10);
  let pos = u32(view, eocd + 16);
  if (count === 0xffff || pos === 0xffffffff) {
    // ZIP64 end-of-central-directory locator sits just before the EOCD.
    let locator = -1;
    for (let i = eocd - 20; i >= Math.max(0, eocd - 20 - 64); i--) {
      if (u32(view, i) === EOCD64_LOCATOR_SIG) {
        locator = i;
        break;
      }
    }
    if (locator < 0) throw new Error('zip: ZIP64 locator not found');
    const eocd64 = u64(view, locator + 8);
    if (eocd64 + 56 > raw.length) throw new Error('zip: corrupt ZIP64 header');
    count = u64(view, eocd64 + 32);
    pos = u64(view, eocd64 + 48);
  }
  const out: Record<string, Uint8Array> = {};
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (pos + 46 > raw.length || u32(view, pos) !== CD_SIG) throw new Error('zip: corrupt central directory');
    const method = u16(view, pos + 10);
    let compSize = u32(view, pos + 20);
    let uncompSize = u32(view, pos + 24);
    const nameLen = u16(view, pos + 28);
    const extraLen = u16(view, pos + 30);
    const commentLen = u16(view, pos + 32);
    let localOffset = u32(view, pos + 42);
    if (pos + 46 + nameLen > raw.length) throw new Error('zip: corrupt entry name');
    const name = decoder.decode(raw.subarray(pos + 46, pos + 46 + nameLen));
    const extraStart = pos + 46 + nameLen;
    pos += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    if (compSize === 0xffffffff || uncompSize === 0xffffffff || localOffset === 0xffffffff) {
      // Java-style ZIP64: real 64-bit values live in extra field tag 0x0001,
      // ordered as uncompressed size, compressed size, local offset.
      let cursor = extraStart;
      let resolved = false;
      while (cursor + 4 <= extraStart + extraLen) {
        const tag = u16(view, cursor);
        const size = u16(view, cursor + 2);
        cursor += 4;
        if (tag === ZIP64_EXTRA_TAG) {
          let field = cursor;
          const take = () => {
            const value = u64(view, field);
            field += 8;
            return value;
          };
          if (uncompSize === 0xffffffff) uncompSize = take();
          if (compSize === 0xffffffff) compSize = take();
          if (localOffset === 0xffffffff) localOffset = take();
          resolved = true;
          break;
        }
        cursor += size;
      }
      if (!resolved) throw new Error(`zip: ZIP64 sizes missing (${name})`);
    }
    if (compSize > MAX_ENTRY_BYTES || uncompSize > MAX_ENTRY_BYTES) throw new Error(`zip: entry too large (${name})`);
    if (localOffset + 30 > raw.length) throw new Error('zip: corrupt local header');
    const localNameLen = u16(view, localOffset + 26);
    const localExtraLen = u16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    if (dataStart + compSize > raw.length) throw new Error(`zip: truncated entry (${name})`);
    const compressed = raw.subarray(dataStart, dataStart + compSize);
    if (method === 0) out[name] = verifyOutputSize(name, compressed.slice(), uncompSize);
    else if (method === 8) out[name] = verifyOutputSize(name, inflateSync(compressed), uncompSize);
    else throw new Error(`zip: unsupported method ${method} (${name})`);
  }
  return out;
}
