import { adminApi } from '@/lib/api';

export async function fetchParserRunLogLines(
  runId: string,
): Promise<{ lines: string[]; lastSeq: number }> {
  const res = await adminApi.getRunLogsFull(runId, { quiet: true });
  return { lines: res.data.lines, lastSeq: res.data.lastSeq };
}
