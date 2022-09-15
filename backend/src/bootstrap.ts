import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL
  });

  return app;
}
