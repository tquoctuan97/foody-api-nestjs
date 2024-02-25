import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto, SignInDto } from './dto/sign-in.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('/api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Post('change-password')
  @ApiBearerAuth()
  changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    console.log({ user: req.user });
    return this.authService.changePassword(req.user.email, changePasswordDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
