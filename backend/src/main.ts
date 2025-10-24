import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ProfilePays API')
    .setDescription('API for ProfilePays - Turn your profile into profit')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('campaigns', 'Campaign management endpoints')
    .addTag('payments', 'Payment processing endpoints')
    .addTag('files', 'File upload and management endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 ProfilePays API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
