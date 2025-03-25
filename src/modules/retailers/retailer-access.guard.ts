import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { Types } from 'mongoose';

// Định nghĩa metadata key để sử dụng trong controller
export const RETAILER_ROLE_KEY = 'retailerRoles';
export const RETAILER_ID_HEADER = 'x-retailer-id';

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const retailerRoleOptions = this.reflector.get<RetailerRoleOptions>(
      RETAILER_ROLE_KEY,
      context.getHandler(),
    );

    if (!retailerRoleOptions) {
      console.log('NO ROLE OPTIONS');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Lấy retailerId từ nhiều nguồn khác nhau
    const retailerId =
    request.headers[RETAILER_ID_HEADER] ||
      request.query.id ||
      request.params.id;

    // Kiểm tra URL để biết nếu đây là endpoint upload
    const isUploadEndpoint = request.originalUrl.includes(
      '/attachments/upload',
    );

    console.log('Request URL:', request.originalUrl);
    console.log('Request method:', request.method);
    console.log('Found retailerId:', retailerId);

    // Nếu đây là endpoint upload và không tìm thấy retailerId, cho phép đi qua và để controller xử lý
    if (isUploadEndpoint && !retailerId) {
      console.log(
        'Upload endpoint detected, allowing request to proceed to controller',
      );
      return true;
    }

    if (!user) {
      return false;
    }

    if (user.role === 'admin') {
      console.log({ canAccessAsAdmin: true });
      return true;
    }

    if (!retailerId) {
      console.log('NO RETAILER ID');
      return false;
    }

    const userDetails = await this.usersService.findById(user.id);
    const userIsOwner = userDetails.ownedRetailer.includes(
      new Types.ObjectId(retailerId),
    );

    const userIsMod = userDetails.modRetailer.includes(
      new Types.ObjectId(retailerId),
    );

    if (!userIsOwner && !userIsMod) {
      console.log('NO USER IS OWNER OR MOD', userDetails, retailerId);
      return false;
    }

    const canAccessAsOwner =
      retailerRoleOptions.roles.includes(RetailerRole.OWNER) && userIsOwner;
    const canAccessAsMod =
      retailerRoleOptions.roles.includes(RetailerRole.MOD) && userIsMod;
    console.log('GUARD CHECK', {
      retailerId,
      roles: retailerRoleOptions.roles,
      canAccessAsOwner,
      canAccessAsMod,
      userIsOwner,
      userIsMod,
    });
    if (!canAccessAsOwner && !canAccessAsMod) {
      console.log('CAN NOT ACCESS');
      return false;
    }

    console.log('CAN ACCESS');
    return true;
  }
}
