import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';

import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Campaign } from './campaigns/entities/campaign.entity';
import { CampaignParticipation } from './campaigns/entities/campaign-participation.entity';

function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  if (!config.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
    );
  }
  return config;
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),

    // Rate Limiting (ttl is milliseconds since @nestjs/throttler v5)
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 10,
      },
    ]),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME', 'profilepays'),
        entities: [User, RefreshToken, Campaign, CampaignParticipation],
        synchronize: configService.get('NODE_ENV') === 'development',
        migrations: ['dist/database/migrations/*.js'],
        logging: configService.get('NODE_ENV') === 'development',
        ssl:
          configService.get('DB_SSL') === 'true'
            ? { rejectUnauthorized: configService.get('DB_SSL_REJECT_UNAUTHORIZED') !== 'false' }
            : false,
      }),
      inject: [ConfigService],
    }),

    // Application modules
    AuthModule,
    UsersModule,
    CampaignsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}