import { join } from 'path';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import './common/sentry.config';
import { AppModule } from './app.module';
import { PrettyLogger } from './common/logger/pretty-logger';

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isDev ? new PrettyLogger() : undefined,
  });

  app.set('trust proxy', true);

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
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => Object.values(error.constraints || {}).join(', '));
        return new BadRequestException(messages.join('; '));
      },
    }),
  );

  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Access-Control-Allow-Origin',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      res.setHeader(
        'Access-Control-Allow-Origin',
        process.env.FRONTEND_URL || 'http://localhost:3000',
      );
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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

  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    if (res.statusCode === 404) {
      res.setHeader(
        'Access-Control-Allow-Origin',
        process.env.FRONTEND_URL || 'http://localhost:3000',
      );
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('Kupito API')
    .setDescription('API documentation for Kupito platform')
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
