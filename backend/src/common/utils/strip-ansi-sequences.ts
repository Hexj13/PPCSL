const ESC = String.fromCharCode(0x1b);
const CSI_SEQUENCE = new RegExp(`${ESC}\\[[\\d;]*[A-Za-z]`, 'g');

export function stripAnsiSequences(value: string): string {
  let out = value;
  let prev = '';
  while (out !== prev) {
    prev = out;
    out = out.replace(CSI_SEQUENCE, '');
  }
  return out;
}
