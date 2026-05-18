import { blurhashToDataURL } from '@/lib/utils/blurhash';

export function getDecodedBlurhashFromCache(_hash: string): string | undefined {
  return undefined;
}

export async function decodeBlurhashOffMain(hash: string): Promise<string | undefined> {
  try {
    return blurhashToDataURL(hash);
  } catch {
    return undefined;
  }
}
