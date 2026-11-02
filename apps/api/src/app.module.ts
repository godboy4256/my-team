import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST');
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'mysql' as const,
          host,
          port: Number(config.get<string>('DB_PORT', '3306')),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: Boolean(host) && !isProduction,
          retryAttempts: 3,
          retryDelay: 2000,
        };
      },
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
