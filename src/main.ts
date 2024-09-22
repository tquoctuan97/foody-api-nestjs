import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DecodeUriPipe } from './common/decode-uri/decode-uri.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.ALLOW_ORIGIN.split(','),
    },
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalPipes(new DecodeUriPipe());

  const config = new DocumentBuilder()
    .setTitle('Foody API')
    .setDescription('The foody API description')
    .setVersion('1.1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
