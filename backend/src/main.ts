import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: false,
  });

  // Increase body size limit for file uploads (default is 1MB)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global filters and interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('UniCircle API')
    .setDescription('UniCircle Backend API - Campus & Alumni Network')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Health check
  app.getHttpAdapter().get('/healthz', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve static files from storage folder
  const express = require('express');
  const path = require('path');
  const configService = app.get(ConfigService);
  
  // Get storage path from environment variable (same as upload service uses)
  const envStoragePath = configService.get<string>('STORAGE_PATH');
  let storagePath: string;
  if (envStoragePath) {
    // Use absolute path from env if provided
    storagePath = path.isAbsolute(envStoragePath) 
      ? envStoragePath 
      : path.resolve(process.cwd(), envStoragePath);
  } else {
    // Default: storage folder outside backend (at project root)
    storagePath = path.join(__dirname, '..', '..', 'storage');
  }
  
  // NOTE: Direct /storage access is disabled for security
  // All file access should go through /api/upload/file endpoint with authentication
  // Uncomment below only if you need public access to specific files (not recommended)
  // app.use('/storage', express.static(storagePath));
  // console.log(`📁 Serving static files from: ${storagePath}`);
  
  // Keep old /uploads for backward compatibility (if needed)
  const oldUploadsPath = path.join(__dirname, '..', 'uploads');
  app.use('/uploads', express.static(oldUploadsPath));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 UniCircle API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();

