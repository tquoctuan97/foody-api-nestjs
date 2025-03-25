import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Req,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttachmentService } from './attachment.service';
import { CreateAttachmentDto, AttachmentFilterDto, AttachmentResponseDto } from './dto/attachment.dto';
import {
  RETAILER_ID_HEADER,
  RETAILER_ROLE_KEY,
  RetailerRole,
  RetailerRoleGuard,
} from '../retailers/retailer-access.guard';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Attachments')
@ApiBearerAuth()
@ApiHeader({
  name: RETAILER_ID_HEADER,
  description: 'ID của retailer',
  required: true,
})
@UseGuards(RetailerRoleGuard)
@Controller('api/v1/admin/attachments')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './temp-uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: MAX_FILE_SIZE, // 10MB in bytes
      },
      fileFilter: (req, file, cb) => {
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ): Promise<AttachmentResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const retailerId = req.headers[RETAILER_ID_HEADER];
    if (!retailerId) {
      throw new BadRequestException('retailerId is required in x-retailer-id header');
    }

    return this.attachmentService.uploadFile(
      file, 
      retailerId,
      req
    );
  }

  @Get()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async findAll(
    @Query() query: AttachmentFilterDto,
    @Req() req: Request,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.attachmentService.findAll(query, req);
  }

  @Get(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentService.findOne(id, req);
  }

  @Delete(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  async remove(@Param('id') id: string, @Req() req): Promise<AttachmentResponseDto> {
    return this.attachmentService.remove(id, req);
  }

  @Delete('hard-delete/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  async hardDelete(@Param('id') id: string, @Req() req): Promise<AttachmentResponseDto> {
    return this.attachmentService.hardDelete(id, req);
  }

  @Get('file/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async getFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentService.findOne(id, req);
    
    // Đường dẫn đầy đủ tới file
    const filePath = path.join(process.cwd(), attachment.path);
    
    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }
    
    // Đọc file và trả về 
    return res.sendFile(filePath);
  }

  @Get('view/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async viewFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentService.findOne(id, req);
    
    // Đường dẫn đầy đủ tới file
    const filePath = path.join(process.cwd(), attachment.path);
    
    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }
    
    // Set Content-Type dựa trên mimeType của file
    res.set('Content-Type', attachment.mimeType);
    
    // Đọc file và trả về để hiển thị (không phải tải xuống)
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
} 