const PART_SIZE = 5 * 1024 * 1024;

function putPart(url: string, blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.onload = () => {
      const raw = xhr.getResponseHeader('ETag');
      const etag = raw ? raw.replace(/"/g, '') : '';
      if (xhr.status >= 200 && xhr.status < 300 && etag) {
        resolve(etag);
      } else {
        reject(new Error(`Upload part failed: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload part network error'));
    xhr.send(blob);
  });
}

export async function uploadListingVideoMultipart(params: {
  file: File;
  parts: { partNumber: number; url: string }[];
  partSizeBytes: number;
  onProgress: (_ratio: number) => void;
}): Promise<{ PartNumber: number; ETag: string }[]> {
  const { file, parts, partSizeBytes, onProgress } = params;
  const out: { PartNumber: number; ETag: string }[] = [];
  let uploaded = 0;
  for (const { partNumber, url } of parts) {
    const start = (partNumber - 1) * partSizeBytes;
    const end = Math.min(start + partSizeBytes, file.size);
    const blob = file.slice(start, end);
    const etag = await putPart(url, blob);
    out.push({ PartNumber: partNumber, ETag: etag });
    uploaded += end - start;
    onProgress(uploaded / file.size);
  }
  return out;
}

export function listingVideoPartSizeDefault(): number {
  return PART_SIZE;
}
