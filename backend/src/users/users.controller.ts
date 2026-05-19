import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService, UpdateProfileDto } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserType } from '../database/entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  async getProfile(@CurrentUser() user: User) {
    const { passwordHash, ...profile } = user;
    return profile;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    const { passwordHash, ...profile } = updated;
    return profile;
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet balance' })
  async getWallet(@CurrentUser() user: User) {
    return this.usersService.getWalletBalance(user.id);
  }

  // Admin-only routes
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: '[Admin] List all users' })
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Put(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Suspend a user' })
  async suspendUser(@Param('id') id: string) {
    return this.usersService.suspendUser(id);
  }

  @Put(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Activate a user' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }
}
