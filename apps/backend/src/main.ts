import { JetStream, JETSTREAM_TRANSPORT } from '@initbit/nestjs-jetstream';
import { NestFactory } from '@nestjs/core';
import { setupSwagger } from 'lib/infrastructure/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });

  // Connect JetStream microservice to handle message/event patterns
  const transport = app.get<JetStream>(JETSTREAM_TRANSPORT);
  app.connectMicroservice({ strategy: transport });

  app.setGlobalPrefix('api');

  await app.startAllMicroservices();

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
