import { readFile } from 'fs/promises';
import { join } from 'path';

import { ImageResponse } from 'next/og';

import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const siteConfig = loadSiteConfigSync(getCountry());

export const runtime = 'nodejs';
export const alt = `${siteConfig.name} - ${getServerTranslations().metadata.site.defaultTitle}`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);

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
      },
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'linear-gradient(135deg, #2E6F51 0%, #40916B 100%)',
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
            {siteConfig.name}
          </div>
          <div
            style={{
              fontSize: 48,
              textAlign: 'center',
              padding: '0 40px',
            }}
          >
            {t.metadata.site.defaultDescription}
          </div>
        </div>
      ),
      {
        ...size,
      },
    );
  }
}
