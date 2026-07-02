import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';

// Initialize config module
ConfigModule.forRoot({
  envFilePath: '.env',
});

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'profilepays',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
