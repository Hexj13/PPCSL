import * as path from 'path';

export function resolveParsingRuntimeRoot(): string {
  const fromEnv = process.env.PARSING_RUNTIME_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), 'runtime', 'parsing');
}
