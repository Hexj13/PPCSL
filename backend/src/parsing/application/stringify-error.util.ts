export function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack?.trim() || error.message;
  }
  return String(error);
}
