import { BadRequestException } from '@nestjs/common';

type HeicConvertFn = (_options: {
  buffer: Uint8Array;
  format: 'JPEG' | 'PNG';
  quality?: number;
}) => Promise<ArrayBuffer | Uint8Array | Buffer>;

function toNodeBuffer(output: ArrayBuffer | Uint8Array | Buffer): Buffer {
  if (Buffer.isBuffer(output)) {
    return output;
  }
  if (output instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(output));
  }
  return Buffer.from(output);
}

async function loadHeicConvert(): Promise<HeicConvertFn> {
  const imported = await import('heic-convert');
  return imported.default;
}

export async function decodeHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    const convert = await loadHeicConvert();
    const output = await convert({
      buffer: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
      format: 'JPEG',
      quality: 1,
    });
    const jpeg = toNodeBuffer(output);
    if (jpeg.length === 0) {
      throw new Error('empty jpeg');
    }
    return jpeg;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException('errors.invalidFileType');
  }
}
