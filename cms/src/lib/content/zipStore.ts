/** Minimal ZIP (STORE method, no extra deps). */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: Buffer };

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n >>> 0, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

export const ZIP_MAX_BYTES = 48 * 1024 * 1024;

export function packZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  let total = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const data = entry.data;
    const crc = crc32(data);
    const local = Buffer.concat([
      Buffer.from("PK\u0003\u0004", "binary"),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = Buffer.concat([
      Buffer.from("PK\u0001\u0002", "binary"),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    total += local.length + central.length;
    if (total + 22 > ZIP_MAX_BYTES) {
      throw new Error("This zip is too large — export one item");
    }
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.concat([
    Buffer.from("PK\u0005\u0006", "binary"),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralBuf.length),
    u32(offset),
    u16(0),
  ]);
  const out = Buffer.concat([...locals, centralBuf, eocd]);
  if (out.length > ZIP_MAX_BYTES) {
    throw new Error("This zip is too large — export one item");
  }
  return out;
}

export function unpackZip(buf: Buffer): ZipEntry[] {
  if (buf.length < 22) throw new Error("Not a zip file");
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  const centralSize = buf.readUInt32LE(eocd + 12);
  const centralOffset = buf.readUInt32LE(eocd + 16);
  if (centralOffset + centralSize > buf.length) throw new Error("Zip is corrupt");

  const out: ZipEntry[] = [];
  let cursor = centralOffset;
  for (let n = 0; n < count; n++) {
    if (cursor + 46 > buf.length) throw new Error("Zip is corrupt");
    if (buf.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Zip is corrupt");
    const method = buf.readUInt16LE(cursor + 10);
    const compressed = buf.readUInt32LE(cursor + 20);
    const nameLen = buf.readUInt16LE(cursor + 28);
    const extraLen = buf.readUInt16LE(cursor + 30);
    const commentLen = buf.readUInt16LE(cursor + 32);
    const localOff = buf.readUInt32LE(cursor + 42);
    const name = buf.subarray(cursor + 46, cursor + 46 + nameLen).toString("utf8");
    cursor += 46 + nameLen + extraLen + commentLen;

    if (localOff + 30 > buf.length) throw new Error("Zip is corrupt");
    if (buf.readUInt32LE(localOff) !== 0x04034b50) throw new Error("Zip is corrupt");
    const localNameLen = buf.readUInt16LE(localOff + 26);
    const localExtra = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + localNameLen + localExtra;
    const dataEnd = dataStart + compressed;
    if (dataEnd > buf.length) throw new Error("Zip is corrupt");
    if (method !== 0) throw new Error("Zip compression is not supported — export again from this Desk");
    out.push({ name, data: Buffer.from(buf.subarray(dataStart, dataEnd)) });
  }
  return out;
}
