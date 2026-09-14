export type TmbKind = "zip" | "sqlite" | "unknown";

export function detectTmbKind(bytes: Uint8Array): TmbKind {
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "zip";
  }
  if (bytes.length > 16) {
    const header = String.fromCharCode(...bytes.slice(0, 16));
    if (header === "SQLite format 3\0") return "sqlite";
  }
  return "unknown";
}
