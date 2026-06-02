import { createRequire } from 'module';

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const nodeRequire = createRequire(__filename);

function devPinoTransport():
  | { target: 'pino-pretty'; options: { singleLine: true; colorize: true } }
  | undefined {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }
  try {
    nodeRequire.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { singleLine: true, colorize: true } };
  } catch {
    return undefined;
  }
}

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        autoLogging: process.env.NODE_ENV === 'production',
        customProps: (req) => ({
          requestId: (req as { requestId?: string }).requestId,
        }),
        serializers: {
          req: (req) => ({
            id: (req as { requestId?: string }).requestId,
            method: req.method,
            url: req.url,
          }),
        },
        transport: devPinoTransport(),
      },
    }),
  ],
})
export class AppLoggerModule {}
