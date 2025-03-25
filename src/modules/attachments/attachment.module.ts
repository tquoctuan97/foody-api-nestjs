import { Module } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Attachment, AttachmentSchema } from './entities/attachment.entity';
import { UsersModule } from '../users/users.module';
import { RetailersModule } from '../retailers/retailers.module';
import { MulterModule } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
    MulterModule.register({
      dest: './temp-uploads',
    }),
    AuditLogsModule,
    UsersModule,
    RetailersModule,
  ],
  controllers: [AttachmentController],
  exports: [AttachmentService],
  providers: [
    {
      provide: 'APP_INTERCEPTOR',
      useFactory: () => {
        // Đảm bảo thư mục tạm tồn tại
        const tempDir = path.join(process.cwd(), 'temp-uploads');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
      },
    },
    AttachmentService
  ],
})
export class AttachmentModule {} 