import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env['WEB_ORIGIN']?.split(',') ?? 'http://localhost:3000',
  });
  const port = Number(process.env['PORT'] ?? 3001);
  await app.listen(port);
  console.log(`My Team API listening at http://localhost:${port}/api`);
}

void bootstrap();
