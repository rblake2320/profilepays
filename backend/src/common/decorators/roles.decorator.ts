import { SetMetadata } from '@nestjs/common';
import { UserType } from '../../database/entities/user.entity';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);
