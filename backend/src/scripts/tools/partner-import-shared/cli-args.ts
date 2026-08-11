export function readFlagValue(
  args: string[],
  index: number,
  flag: string,
): { value: string; nextIndex: number } | null {
  const arg = args[index];
  if (arg === flag) {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      return null;
    }
    return { value, nextIndex: index + 1 };
  }
  if (arg.startsWith(`${flag}=`)) {
    const value = arg.slice(flag.length + 1);
    if (!value) {
      return null;
    }
    return { value, nextIndex: index };
  }
  return null;
}
