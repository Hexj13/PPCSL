import * as Sentry from '@sentry/node';
import { SimpleConsoleLogger } from 'typeorm';

export class TypeormSlowQueryLogger extends SimpleConsoleLogger {
  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    if (process.env.NODE_ENV === 'production') {
      super.logQuerySlow(time, query);
      Sentry.captureMessage(`Slow SQL query (${Math.round(time)}ms)`, {
        level: 'warning',
        extra: {
          durationMs: time,
          query: query.slice(0, 2000),
        },
      });
      return;
    }
    super.logQuerySlow(time, query, parameters);
  }
}
