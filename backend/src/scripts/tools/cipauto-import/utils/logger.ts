type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class Logger {
  private readonly debugEnabled: boolean;

  constructor(debugEnabled = false) {
    this.debugEnabled = debugEnabled;
  }

  info(scope: string, message: string): void {
    this.log('INFO', scope, message);
  }

  warn(scope: string, message: string): void {
    this.log('WARN', scope, message);
  }

  error(scope: string, message: string): void {
    this.log('ERROR', scope, message);
  }

  debug(scope: string, message: string): void {
    if (this.debugEnabled) {
      this.log('DEBUG', scope, message);
    }
  }

  private log(level: Level, scope: string, message: string): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] [${scope}] ${message}`;
    if (level === 'ERROR') {
      console.error(line);
      return;
    }
    if (level === 'WARN') {
      console.warn(line);
      return;
    }
    console.log(line);
  }
}
