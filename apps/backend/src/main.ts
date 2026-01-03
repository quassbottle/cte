import { NestFactory } from '@nestjs/core';
import { setupSwagger } from 'lib/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
