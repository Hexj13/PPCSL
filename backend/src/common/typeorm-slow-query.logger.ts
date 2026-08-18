import { SimpleConsoleLogger } from 'typeorm';

export class TypeormSlowQueryLogger extends SimpleConsoleLogger {
  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    if (process.env.NODE_ENV === 'production') {
      super.logQuerySlow(time, query);
      return;
    }
    super.logQuerySlow(time, query, parameters);
  }
}
