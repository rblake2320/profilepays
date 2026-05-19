import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PaymentsModule } from './payments/payments.module';
import { User } from './database/entities/user.entity';
import { Campaign } from './database/entities/campaign.entity';
import { Participation } from './database/entities/participation.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService): Promise<TypeOrmModuleOptions> => {
        const isProduction = config.get('NODE_ENV') === 'production';
        const dbType = config.get<string>('DB_TYPE', isProduction ? 'postgres' : 'better-sqlite3');

        if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
          const opts: TypeOrmModuleOptions = {
            type: 'better-sqlite3',
            database: config.get<string>('SQLITE_PATH', './profilepays.sqlite'),
            entities: [User, Campaign, Participation],
            synchronize: true,
            logging: config.get('NODE_ENV') === 'development',
          };
          return opts;
        }

        const opts: TypeOrmModuleOptions = {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'profilepays_user'),
          password: config.get<string>('DB_PASSWORD', 'profilepays_password'),
          database: config.get<string>('DB_DATABASE', 'profilepays_db'),
          entities: [User, Campaign, Participation],
          synchronize: !isProduction,
          logging: config.get('NODE_ENV') === 'development',
          ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        };
        return opts;
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CampaignsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
