import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        userRole: { type: 'string' },
        phoneNumber: { type: 'string', nullable: true },
        dateOfBirth: { type: 'string', format: 'date', nullable: true },
        profileImage: { type: 'string', nullable: true },
        isVerified: { type: 'boolean' },
        isActive: { type: 'boolean' },
        lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    const profile = await this.usersService.getProfile(user.id);
    return profile.toResponseObject();
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.usersService.updateProfile(
      user.id,
      updateProfileDto,
    );

    this.logger.log(`Profile updated for user: ${user.email}`);

    return updatedUser.toResponseObject();
  }

  @Delete('me')
  @ApiOperation({ summary: 'Deactivate current user account' })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
  })
  async deactivateAccount(@CurrentUser() user: CurrentUserData) {
    await this.usersService.deactivateUser(user.id);

    this.logger.log(`Account deactivated for user: ${user.email}`);

    return { message: 'Account deactivated successfully' };
  }

  // Admin-only endpoints
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              userRole: { type: 'string' },
              isVerified: { type: 'boolean' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const result = await this.usersService.findUsers(page, limit, search);

    this.logger.log(`Users list requested by admin: ${currentUser?.email}`);

    return {
      ...result,
      users: result.users.map(user => user.toResponseObject()),
    };
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User statistics',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        verifiedUsers: { type: 'number' },
        unverifiedUsers: { type: 'number' },
        memberUsers: { type: 'number' },
        advertiserUsers: { type: 'number' },
        adminUsers: { type: 'number' },
      },
    },
  })
  async getUserStats(@CurrentUser() currentUser: CurrentUserData) {
    const stats = await this.usersService.getUserStats();

    this.logger.log(`User stats requested by admin: ${currentUser.email}`);

    return stats;
  }
}