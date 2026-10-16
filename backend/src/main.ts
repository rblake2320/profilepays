import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { static as serveStatic } from 'express';
import { existsSync } from 'fs';
import { resolve } from 'path';

import { AppModule } from './app.module';
import { inputValidationPipe } from './common/input-validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const nodeEnv = configService.get('NODE_ENV', 'development');
  if (nodeEnv === 'production' && (!configService.get<string>('JWT_SECRET') || configService.get<string>('JWT_SECRET').length < 32)) {
    throw new Error('Production requires a private JWT_SECRET of at least 32 characters');
  }

  // Only enable behind the dedicated loopback-only Cloudflare Tunnel deployment.
  // CF-Connecting-IP is set by Cloudflare; discard arbitrary client X-Forwarded-For values.
  if (configService.get('TRUST_CLOUDFLARE_TUNNEL') === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.use((req, _res, next) => {
      req.headers['x-forwarded-for'] = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
      next();
    });
  }

  // Security middleware
  app.use(helmet());
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    inputValidationPipe(),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Serve the compiled dashboard and API from one HTTPS origin in the shipped container.
  const frontendDist = configService.get<string>('FRONTEND_DIST');
  if (frontendDist) {
    const directory = resolve(frontendDist), index = resolve(directory, 'index.html');
    if (!existsSync(index)) throw new Error('Compiled dashboard index.html is missing');
    app.use(serveStatic(directory, { index: false, dotfiles: 'deny' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || /^\/api(?:\/|$)/.test(req.path) || /\.[a-z0-9]+$/i.test(req.path)) return next();
      // Prevent edge-injected scripts that conflict with our self-only CSP.
      res.setHeader('Cache-Control', 'no-store, no-transform');
      res.sendFile(index);
    });
  }

  // Swagger documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ProfilePays API')
      .setDescription('ProfilePays backend API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port, configService.get<string>('HOST', '127.0.0.1'));
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${nodeEnv}`);

  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
