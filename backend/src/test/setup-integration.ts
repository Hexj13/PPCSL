import * as fs from 'fs';
import * as path from 'path';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';
import { EmailService } from '../auth/infrastructure/services/email.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { I18nService } from '../common/i18n/i18n.service';

let app: INestApplication;
let swaggerDocument: OpenAPIObject;

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue({
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      verifyToken: jest.fn().mockResolvedValue(null),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    })
    .compile();

  app = moduleFixture.createNestApplication();

  const i18nService = moduleFixture.get<I18nService>(I18nService);
  app.useGlobalFilters(new HttpExceptionFilter(i18nService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

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

  swaggerDocument = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.init();

  const swaggerPath = path.join(__dirname, '../../swagger.json');
  fs.writeFileSync(swaggerPath, JSON.stringify(swaggerDocument, null, 2));

  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    try {
      await app.close();
    } catch (error) {
      console.error('Error closing test app:', error);
    }
  }
}

export function getSwaggerDocument(): OpenAPIObject {
  return swaggerDocument;
}

export function getTestRequest(): request.SuperTest<request.Test> {
  return request(app.getHttpServer());
}
