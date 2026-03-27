export function decodeBase64Array(encoded: string): string[] {
  if (!encoded) return [];
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json =
      typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return encoded.split(',').filter((v) => v.trim() !== '');
  }
}

export function encodeBase64Array(arr: string[]): string {
  if (arr.length === 0) return '';
  try {
    const json =
      typeof btoa !== 'undefined'
        ? btoa(JSON.stringify(arr))
        : Buffer.from(JSON.stringify(arr)).toString('base64');
    return json.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch {
    return arr.join(',');
  }
}
