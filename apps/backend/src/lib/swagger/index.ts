import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export const setupSwagger = (app: INestApplication) => {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('User Service')
    .setDescription('Auth and user management API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste JWT access token',
      },
      'bearer',
    )
    .build();

  const openApiDoc = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(openApiDoc), {
    swaggerOptions: { persistAuthorization: true },
  });
};
