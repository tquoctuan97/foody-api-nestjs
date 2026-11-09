import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { IsObjectIdPipe } from 'src/common/is-object-id/is-object-id.pipe';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserParams } from './models/user.model';
import { PaginatedUserResponse } from './dto/user-response.dto';

@Controller('api/v1/admin/users')
@ApiTags('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ type: User })
  create(@Request() req, @Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(req.user, createUserDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List users (paginated)' })
  @ApiOkResponse({ type: PaginatedUserResponse })
  getAll(
    @Query() params: UserParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    params.isDeleted = isDeleted;
    return this.usersService.getAll(params);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: User })
  getOne(@Param('id', IsObjectIdPipe) id: string) {
    return this.usersService.getOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: User })
  update(
    @Request() req,
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user, id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: User })
  delete(@Request() req, @Param('id', IsObjectIdPipe) id: string) {
    return this.usersService.delete(req.user, id);
  }
}
