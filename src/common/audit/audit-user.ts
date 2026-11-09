import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRequest } from 'src/modules/auth/models/auth.model';
import { Role } from 'src/modules/users/models/user.model';

type PopulatableDoc = {
  populate: (options: unknown) => unknown;
};

export function toUserObjectId(userId: string): Types.ObjectId {
  return new Types.ObjectId(userId);
}

export function mapAuditUser(
  user?: { _id: Types.ObjectId; name: string } | null,
) {
  if (!user) {
    return user;
  }
  return { _id: user._id, name: user.name };
}

const AUDIT_USER_PATHS = ['createdBy', 'updatedBy', 'deletedBy'] as const;

export function auditUserPopulateOptions() {
  return AUDIT_USER_PATHS.map((path) => ({
    path,
    transform: mapAuditUser,
  }));
}

export async function populateAuditUsers<T extends PopulatableDoc>(doc: T) {
  await doc.populate(auditUserPopulateOptions());
  return doc;
}

export function assertOwnerOrAdmin(
  user: UserRequest,
  ownerId: Types.ObjectId | string | undefined | null,
  action: string,
) {
  if (user.role === Role.ADMIN) {
    return;
  }
  const owner = ownerId?.toString();
  if (!owner || owner !== user.id) {
    throw new ForbiddenException(`You do not have permission to ${action}`);
  }
}

export function assertNotSoftDeleted(
  deletedAt: Date | null | undefined,
  entityLabel: string,
) {
  if (deletedAt) {
    throw new ForbiddenException(`Can't update deleted ${entityLabel}`);
  }
}

export function softDeleteAudit(userId: string) {
  return {
    deletedAt: new Date(),
    deletedBy: toUserObjectId(userId),
  };
}

export function setUpdatedBy(userId: string) {
  return { updatedBy: toUserObjectId(userId) };
}

export function setCreatedBy(userId: string) {
  return { createdBy: toUserObjectId(userId) };
}
