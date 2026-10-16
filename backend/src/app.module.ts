import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PlacementsModule } from './placements/placements.module';
import { HealthController } from './health.controller';
import { SupportModule } from './support/support.module';

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
        synchronize: false,
        migrationsRun: configService.get('PLACEMENT_MIGRATE') === 'true',
        migrations: [__dirname + '/database/migrations/*.js'],
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Application modules
    PlacementsModule,
    SupportModule,
    AuthModule,
    UsersModule,
    // Legacy campaign endpoints are superseded by the guarded placement lifecycle.
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
