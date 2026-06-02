import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

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
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
            : undefined,
      },
    }),
  ],
})
export class AppLoggerModule {}
