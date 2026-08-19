import { join } from 'path';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { json, text, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import './common/observability/tracing';
import './common/sentry.config';
import { AppModule } from './app.module';
import { PrettyLogger } from './common/logger/pretty-logger';
import { apiV1AliasMiddleware } from './common/middleware/api-v1-alias.middleware';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { resolvePlatformName } from './common/platform-name';

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(isDev ? new PrettyLogger() : app.get(Logger));

  app.enableShutdownHooks();
  app.set('trust proxy', true);

  // SNS HTTPS notifications use text/plain; json() would skip the body and break
  // /api/webhooks/mediaconvert confirmation + job events.
  app.use('/api/webhooks/mediaconvert', text({ type: '*/*', limit: '1mb' }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(
    compression({
      filter: (req) => !req.url?.startsWith('/uploads'),
    }),
  );
  app.use(cookieParser());

  const corsOrigins = (() => {
    const raw = process.env.CORS_ORIGINS?.trim();
    if (raw) {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [process.env.FRONTEND_URL?.trim() || 'http://localhost:3000'];
  })();

  app.use(apiV1AliasMiddleware);
  app.use(requestIdMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:4000', 'http://localhost:3000'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = Object.values(error.constraints || {});
          return constraints
            .map((c) =>
              c.startsWith('validation.') || c.startsWith('errors.')
                ? c
                : 'errors.validationFailed',
            )
            .join('; ');
        });
        return new BadRequestException(messages.join('; '));
      },
    }),
  );

  const frontendOrigin = corsOrigins[0] || 'http://localhost:3000';
  const setUploadsCorsHeaders = (res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', frontendOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  };

  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    setUploadsCorsHeaders(res);
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      setUploadsCorsHeaders(res);
      if (
        path.endsWith('.webp') ||
        path.endsWith('.jpg') ||
        path.endsWith('.jpeg') ||
        path.endsWith('.png')
      ) {
        res.setHeader(
          'Content-Type',
          path.endsWith('.webp')
            ? 'image/webp'
            : path.endsWith('.png')
              ? 'image/png'
              : 'image/jpeg',
        );
      }
    },
  });

  const swaggerSiteName = resolvePlatformName();

  const config = new DocumentBuilder()
    .setTitle(`${swaggerSiteName} API`)
    .setDescription(`API documentation for ${swaggerSiteName} platform`)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication and authorization')
    .addTag('listings', 'Listings')
    .addTag('favorites', 'Favorites')
    .addTag('saved-filters', 'Saved search filters')
    .addTag('users', 'Users')
    .addTag('brands', 'Brands and models')
    .addTag('cities', 'Cities')
    .addTag('upload', 'File upload')
    .addTag('admin', 'Admin panel')
    .build();

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  if (!isProduction) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  if (isDev) {
    console.log(`  → http://localhost:${port}`);
    console.log(`  → Swagger: http://localhost:${port}/api/docs\n`);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
