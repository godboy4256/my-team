import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PositionsModule } from './positions/positions.module';
import { PlayerEvaluationsModule } from './player-evaluations/player-evaluations.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    PlayerEvaluationsModule,
    AuthModule,
    PositionsModule,
    TeamsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST');
        return {
          type: 'mysql' as const,
          host,
          port: Number(config.get<string>('DB_PORT', '3306')),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: false,
          migrations: [join(__dirname, 'migrations/*{.js,.ts}')],
          migrationsRun: Boolean(host),
          retryAttempts: 3,
          retryDelay: 2000,
        };
      },
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
