import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { RetailerService } from './retailers.service';

// Định nghĩa metadata key để sử dụng trong controller
export const RETAILER_ROLE_KEY = 'retailerRoles';

// Interface cho metadata roles, có thể mở rộng thêm các quyền khác nếu cần
export interface RetailerRoleOptions {
  roles: RetailerRole[];
}

// Enum cho các retailer role
export enum RetailerRole {
  OWNER = 'owner',
  MOD = 'mod',
}

@Injectable()
export class RetailerRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
    private retailerService: RetailerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy metadata retailer roles từ handler (controller method)
    const retailerRoleOptions = this.reflector.get<RetailerRoleOptions>(
      RETAILER_ROLE_KEY,
      context.getHandler(),
    );

    // Nếu không có metadata roles, cho phép truy cập (ví dụ: endpoint public)
    if (!retailerRoleOptions) {
      return true;
    }

    const { roles } = retailerRoleOptions; // Chỉ lấy roles
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Giả sử AuthGuard đã xác thực user và gán vào request.user
    const retailerId = request.params.id; // Giả sử retailerId được truyền qua params

    if (!user) {
      return false; // Không có user, không cho phép truy cập
    }

    // Admin có toàn quyền
    if (user.role === 'admin') {
      return true; // Admin có toàn quyền
    }

    if (!retailerId) {
      return false; // Không có retailerId, không cho phép truy cập
    }

    const userRole = user.role;
    const userRetailerRoles = [];

    // Kiểm tra quyền dựa trên retailerRoleOptions và user role
    for (const requiredRole of roles) {
      if (requiredRole === RetailerRole.OWNER) {
        const isOwner = await this.usersService.canAccessRetailer(
          user,
          retailerId,
          'owner',
        );
        // console.log(requiredRole, isOwner);
        if (isOwner) {
          userRetailerRoles.push(RetailerRole.OWNER);
        }
      }
      if (requiredRole === RetailerRole.MOD) {
        const isMod = await this.usersService.canAccessRetailer(
          user,
          retailerId,
          'moderator',
        );
        // console.log(requiredRole, isMod);
        if (isMod) {
          userRetailerRoles.push(RetailerRole.MOD);
        }
      }
    }
    // console.log({ userRetailerRoles });
    // Logic phân quyền đơn giản hóa, không cần action
    if (userRole === 'user') {
      if (userRetailerRoles.includes(RetailerRole.OWNER)) {
        return true; // User là owner có quyền update và xem detail
      }
    }

    if (userRole === 'user' || userRole === 'admin') {
      if (userRetailerRoles.includes(RetailerRole.MOD)) {
        return true; // User hoặc Admin là mod có quyền xem detail
      }
    }

    return false; // Không có quyền truy cập
  }
}
