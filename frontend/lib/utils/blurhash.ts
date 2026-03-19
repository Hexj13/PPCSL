import { decode } from 'blurhash';

const CACHE = new Map<string, string>();

export function blurhashToDataURL(hash: string, width = 32, height = 32): string {
  const cached = CACHE.get(hash);
  if (cached) return cached;

  const pixels = decode(hash, width, height);
  const dataURL = rgbaToDataURL(pixels, width, height);

  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(hash, dataURL);

  return dataURL;
}

function rgbaToDataURL(pixels: Uint8ClampedArray, width: number, height: number): string {
  const rowBytes = width * 3;
  const padding = (4 - (rowBytes % 4)) % 4;
  const stride = rowBytes + padding;
  const pixelDataSize = stride * height;
  const fileSize = 54 + pixelDataSize;

  const buf = new Uint8Array(fileSize);
  const view = new DataView(buf.buffer);

  buf[0] = 0x42;
  buf[1] = 0x4d;
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelDataSize, true);

  let offset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      buf[offset++] = pixels[i + 2];
      buf[offset++] = pixels[i + 1];
      buf[offset++] = pixels[i];
    }
    offset += padding;
  }

  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }

  return `data:image/bmp;base64,${btoa(binary)}`;
}
