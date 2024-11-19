import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/sign-in.dto';
import { comparePassword } from './utils/hashPassword';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/entities/user.entity';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isMatchPassword = await comparePassword(password, user.password);
    if (!isMatchPassword)
      throw new UnauthorizedException('Invalid email or password');

    const payload = { id: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '30s', // Short-lived access token
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1h', // Long-lived refresh token
    });

    // Save refresh token in the database (hashed for security)
    user.refreshToken = refreshToken; // Optional: You can hash it before saving
    await user.save();

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Validate the refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken);

      // Check if refresh token matches the one in the database
      const user = await this.usersService.findById(payload.id);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate a new access token
      const newAccessToken = await this.jwtService.signAsync(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '30s' },
      );

      return { access_token: newAccessToken };
    } catch (err) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  async logout(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    // Clear refresh token from the database
    user.refreshToken = null;
    await user.save();
    return { message: 'Logout successful' };
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
