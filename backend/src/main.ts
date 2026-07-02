import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const nodeEnv = configService.get('NODE_ENV', 'development');

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
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: nodeEnv === 'production',
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

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

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${nodeEnv}`);

  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
  }
}

bootstrap();