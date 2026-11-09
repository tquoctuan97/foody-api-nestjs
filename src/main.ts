import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DecodeUriPipe } from './common/decode-uri/decode-uri.pipe';
import { BillSummaryByCustomerItemDto, BillSummaryByDateItemDto } from './modules/bills/dto/bill-response.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.ALLOW_ORIGIN.split(','),
    },
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalPipes(new DecodeUriPipe());

  const config = new DocumentBuilder()
    .setTitle('Inkvenio API')
    .setDescription(
      [
        'Backend for invoice / bill management (Inkvenio).',
        '',
        '**Authentication:** Most admin routes require `Authorization: Bearer <token>` from `POST /api/v1/auth/login`.',
        'Routes marked public skip the guard (some user list/detail endpoints).',
        '',
        '**Pagination:** `page`, `pageSize`, `search`, `sort` (`+field` ascending, `-field` descending).',
        '**Soft delete:** Bills and customers support `isDeleted=true` on list queries.',
      ].join('\n'),
    )
    .setVersion('2.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /api/v1/auth/login',
      },
      'bearer',
    )
    .addTag('auth', 'Sign-in and session')
    .addTag('admin/users', 'User accounts')
    .addTag('admin/customers', 'Customers')
    .addTag('admin/bills', 'Bills and summaries')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [BillSummaryByDateItemDto, BillSummaryByCustomerItemDto],
  });
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000);
}
bootstrap();
