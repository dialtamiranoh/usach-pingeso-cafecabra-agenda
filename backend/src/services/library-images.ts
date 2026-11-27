export const MAX_IMAGE_BYTES = 500 * 1024;
export const MAX_IMAGE_SIDE = 1600;

// WebP estático: valida contenedor, dimensiones y chunks antes de almacenarlo.
// La conversión se realiza con el decodificador nativo del navegador, sin conservar originales.
export function inspectWebP(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 20 || bytes.length > MAX_IMAGE_BYTES) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = (offset: number, size: number) => String.fromCharCode(...bytes.subarray(offset, offset + size));
  if (str(0, 4) !== 'RIFF' || str(8, 4) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length) return null;
  let size: { width: number; height: number } | null = null;
  let extended: { width: number; height: number } | null = null;
  let frames = 0;
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) return null;
    const kind = str(offset, 4), length = view.getUint32(offset + 4, true), start = offset + 8;
    const end = start + length;
    if (end + (length % 2) > bytes.length) return null;
    if (kind === 'ANIM' || kind === 'ANMF') return null;
    if (kind === 'VP8X') {
      if (length !== 10 || bytes[start] & 2) return null;
      const u24 = (at: number) => bytes[at] + (bytes[at + 1] << 8) + (bytes[at + 2] << 16);
      extended = { width: u24(start + 4) + 1, height: u24(start + 7) + 1 };
    } else if (kind === 'VP8 ') {
      if (length < 10 || (bytes[start] & 1) || str(start + 3, 3) !== '\x9d\x01\x2a') return null;
      size = { width: view.getUint16(start + 6, true) & 0x3fff, height: view.getUint16(start + 8, true) & 0x3fff }; frames++;
    } else if (kind === 'VP8L') {
      if (length < 5 || bytes[start] !== 0x2f || bytes[start + 4] >> 5) return null;
      const bits = view.getUint32(start + 1, true);
      size = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }; frames++;
    }
    offset = end + (length % 2);
  }
  if (frames !== 1 || !size || !size.width || !size.height || Math.max(size.width, size.height) > MAX_IMAGE_SIDE) return null;
  if (extended && (extended.width !== size.width || extended.height !== size.height)) return null;
  return size;
}
export const imageUrl = (id: string) => '/api/imagenes/' + id;
