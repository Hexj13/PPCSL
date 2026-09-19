export const CLIENT_ABORTED_RSC_STREAM_MESSAGE = 'The destination stream closed early.';

export function isClientAbortedRscStreamError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error === CLIENT_ABORTED_RSC_STREAM_MESSAGE;
  }
  return error instanceof Error && error.message === CLIENT_ABORTED_RSC_STREAM_MESSAGE;
}
