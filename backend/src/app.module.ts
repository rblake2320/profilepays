import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DatabaseModule } from './database/database.module';

import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Campaign } from './campaigns/entities/campaign.entity';
import { CampaignParticipation } from './campaigns/entities/campaign-participation.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),

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
        migrations: ['src/database/migrations/*.ts'],
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Application modules
    DatabaseModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}