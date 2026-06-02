import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { getAndroidAssetLinksFromEnv } from '@/lib/asset-links';

const STATIC_RELATIVE = path.join('.well-known', 'assetlinks.json');

async function readStaticAssetLinks(): Promise<string | null> {
  const filePath = path.join(process.cwd(), 'public', STATIC_RELATIVE);
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function GET() {
  const staticJson = await readStaticAssetLinks();
  if (staticJson?.trim()) {
    return new NextResponse(staticJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  }

  const statements = getAndroidAssetLinksFromEnv();
  if (statements.length === 0) {
    return new NextResponse(JSON.stringify([]), {
      status: 404,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json(statements, {
    headers: {
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
}
