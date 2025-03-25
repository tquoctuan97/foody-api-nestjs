import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogFilterDto } from './dto/audit-log.dto';
import { RETAILER_ID_HEADER } from '../retailers/retailer-access.guard';

@ApiBearerAuth()
@ApiHeader({
  name: RETAILER_ID_HEADER,
  description: 'ID của retailer',
  required: true,
})
@ApiTags('audit-logs')
@Controller('api/v1/admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async getAuditLogs(@Query() query: AuditLogFilterDto, @Req() req) {
    return this.auditLogsService.getAuditLogs(query, req);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.auditLogsService.findOne(id, req);
  }
}
