import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { RetailerService } from './retailers.service';
import { Types } from 'mongoose';

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
    const retailerId =
      request.query.retailerId ||
      request.params.retailerId ||
      request.body.retailerId 
      request.query.id ||
      request.params.id;

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
