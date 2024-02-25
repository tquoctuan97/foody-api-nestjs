import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/sign-in.dto';
import { comparePassword } from './utils/hashPassword';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    const isMatchPassword = await comparePassword(password, user.password);

    if (!isMatchPassword) {
      throw new UnauthorizedException();
    }
    const payload = { id: user.id, email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async changePassword(email: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findByEmail(email);

    const isMatchPassword = await comparePassword(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isMatchPassword) {
      throw new BadRequestException('Old password is incorrect');
    }

    const isMatchConfirmPassword =
      changePasswordDto.confirmPassword === changePasswordDto.newPassword;

    if (!isMatchConfirmPassword) {
      throw new BadRequestException('Confirm password is incorrect');
    }

    return await this.usersService.update(user.id, {
      password: changePasswordDto.confirmPassword,
    });
  }

  async getProfile(id: string) {
    return await this.usersService.findById(id);
  }
}
