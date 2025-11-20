import { readFile } from 'fs/promises';
import { join } from 'path';

import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Kupito - Автомобили во Македонија';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  try {
    const imagePath = join(process.cwd(), 'public', 'opengraph-image.png');
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={`data:image/png;base64,${base64Image}`}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ),
      {
        ...size,
      }
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'system-ui',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              marginBottom: 32,
            }}
          >
            Kupito
          </div>
          <div
            style={{
              fontSize: 48,
              textAlign: 'center',
              padding: '0 40px',
            }}
          >
            Купете или продадете авто на Kupito!
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
