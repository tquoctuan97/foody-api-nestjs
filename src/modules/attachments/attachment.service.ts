import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attachment, AttachmentDocument } from './entities/attachment.entity';
import {
  AttachmentFilterDto,
  AttachmentResponseDto,
} from './dto/attachment.dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AUDIT_LOG_ACTION_ENUM,
  AUDIT_LOG_MODULE_ENUM,
} from '../audit-logs/audit-logs.constant';
import { ConfigService } from '@nestjs/config';
import { RETAILER_ID_HEADER } from '../retailers/retailer-access.guard';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

@Injectable()
export class AttachmentService {
  private readonly baseUrl: string;

  constructor(
    @InjectModel(Attachment.name)
    private attachmentModel: Model<AttachmentDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly configService: ConfigService,
  ) {
    // Đảm bảo thư mục uploads tồn tại
    this.ensureUploadsDirectory();

    this.baseUrl = this.configService.get('ATTACHMENT_BASE_URL') || '';
  }

  private ensureUploadsDirectory() {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    retailerId: string,
    req: any,
  ): Promise<AttachmentResponseDto> {
    // Lấy extension từ tên file gốc
    const fileExtension = path.extname(file.originalname);
    
    // Tạo tên file mới chỉ chứa UUID và extension, không có tên file gốc
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const uploadPath = path.join('public', 'uploads', uniqueFileName);
    const fullPath = path.join(process.cwd(), uploadPath);

    // Di chuyển file từ thư mục tạm sang thư mục lưu trữ
    fs.writeFileSync(fullPath, fs.readFileSync(file.path));

    // Xóa file tạm (nếu cần)
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Lưu thông tin file vào database
    const attachment = await this.attachmentModel.create({
      retailerId: new Types.ObjectId(retailerId),
      originalName: file.originalname,
      fileName: uniqueFileName,
      path: uploadPath,
      mimeType: file.mimetype,
      size: file.size,
      createdBy: req.user?.id ? new Types.ObjectId(req.user.id) : null,
    });

    // Ghi log
    await this.auditLogsService.createLog({
      retailerId: attachment.retailerId,
      modifiedBy: new Types.ObjectId(req.user.id),
      module: AUDIT_LOG_MODULE_ENUM.ATTACHMENT,
      action: AUDIT_LOG_ACTION_ENUM.UPLOAD,
      oldData: null,
      newData: attachment.toObject(),
    });
  
    return this.mapToResponseDto(attachment);
  }

  async findAll(
    query: AttachmentFilterDto,
    req: any,
  ): Promise<PaginationDto<AttachmentResponseDto[]>> {
    const currentPage = parseInt(query?.page?.toString()) || 1;
    const pageSize = parseInt(query?.limit?.toString()) || 10;
    const retailerId = req.headers[RETAILER_ID_HEADER];

    if (!retailerId) {
      throw new BadRequestException(
        'RetailerId is required in x-retailer-id header',
      );
    }

    const filter: any = { isDeleted: query?.isDeleted || false };

    // Admin có thể xem tất cả file hoặc lọc theo retailerId
    if (req.user.role !== 'admin') {
      // Nếu không phải admin, chỉ xem được file của retailer trong header
      filter.retailerId = new Types.ObjectId(retailerId);
    } else {
      // Nếu là admin, vẫn lấy retailerId từ header
      filter.retailerId = new Types.ObjectId(retailerId);
    }

    const [attachments, totalCount] = await Promise.all([
      this.attachmentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .populate({
          path: 'createdBy',
          select: '_id name email avatar',
        })
        .populate({
          path: 'lastUpdatedBy',
          select: '_id name email avatar',
        })
        .populate({
          path: 'deletedBy',
          select: '_id name email avatar',
        })
        .lean<Attachment[]>()
        .exec(),
      this.attachmentModel.countDocuments(filter),
    ]);

    const data = attachments.map((attachment) => this.mapToResponseDto(attachment));

    return new PaginationDto<AttachmentResponseDto[]>(data, {
      pageSize: pageSize,
      currentPage: currentPage,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount: totalCount,
      hasNextPage: currentPage < Math.ceil(totalCount / pageSize),
    });
  }

  async findOne(id: string, req: any): Promise<AttachmentResponseDto> {
    const attachment = await this.getAttachment(id, req);
    return this.mapToResponseDto(attachment);
  }

  async remove(id: string, req: any): Promise<AttachmentResponseDto> {
    // Chỉ admin mới có quyền xóa
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admin can delete attachments');
    }

    const attachment = await this.getAttachment(id, req);
    const oldData = { ...attachment.toObject() };

    // Soft delete
    attachment.isDeleted = true;
    attachment.deletedAt = new Date();
    attachment.deletedBy = new Types.ObjectId(req.user.id);

    await attachment.save();

    // Ghi log
    await this.auditLogsService.createLog({
      retailerId: attachment.retailerId,
      modifiedBy: new Types.ObjectId(req.user.id),
      module: AUDIT_LOG_MODULE_ENUM.ATTACHMENT,
      action: AUDIT_LOG_ACTION_ENUM.DELETE,
      oldData,
      newData: attachment.toObject(),
    });

    return this.mapToResponseDto(attachment);
  }

  async hardDelete(id: string, req: any): Promise<AttachmentResponseDto> {
    // Chỉ admin mới có quyền hard delete
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admin can hard delete attachments');
    }

    const attachment = await this.getAttachment(id, req);
    const oldData = { ...attachment.toObject() };

    // Xóa file từ hệ thống
    const filePath = path.join(process.cwd(), attachment.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Xóa từ database
    await attachment.deleteOne();

    // Ghi log
    await this.auditLogsService.createLog({
      retailerId: attachment.retailerId,
      modifiedBy: new Types.ObjectId(req.user.id),
      module: AUDIT_LOG_MODULE_ENUM.ATTACHMENT,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData,
      newData: null,
    });

    return this.mapToResponseDto(attachment);
  }

  private async getAttachment(
    id: string,
    req: any,
  ): Promise<AttachmentDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];

    if (!retailerId) {
      throw new BadRequestException(
        'RetailerId is required in x-retailer-id header',
      );
    }

    const filter: any = { _id: new Types.ObjectId(id) };

    // Nếu không phải admin, chỉ xem được file thuộc retailer mà họ có quyền
    if (req.user.role !== 'admin') {
      filter.retailerId = new Types.ObjectId(retailerId);
    } else {
      // Nếu là admin, vẫn kiểm tra retailerId để đảm bảo chỉ truy cập vào retailer họ chọn
      filter.retailerId = new Types.ObjectId(retailerId);
    }

    const attachment = await this.attachmentModel.findOne(filter);
    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    return attachment;
  }

  private mapToResponseDto(
    attachment: AttachmentDocument,
  ): AttachmentResponseDto {
    const id = attachment._id.toString();
    
      
    // URL trực tiếp đến file (không cần xác thực)
    const directFileUrl = `${this.baseUrl}/uploads/${attachment.fileName}`;
    
    return {
      id,
      retailerId: attachment.retailerId,
      originalName: attachment.originalName,
      fileName: attachment.fileName,
      path: attachment.path,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
      createdBy: attachment.createdBy,
      fileUrl: directFileUrl,
    };
  }
}
