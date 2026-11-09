import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List users (paginated)' })
  @ApiOkResponse({ type: PaginatedUserResponse })
  findAll(@Query() params: UserParams) {
    return this.usersService.findAll(params);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: User })
  findOne(@Param('id', IsObjectIdPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: User })
  update(
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: User })
  remove(@Param('id', IsObjectIdPipe) id: string) {
    return this.usersService.remove(id);
  }
}
