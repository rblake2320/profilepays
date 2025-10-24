import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Returns list of users' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Returns user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // Only allow users to update their own profile (or admins)
    if (req.user.id !== id && req.user.userType !== 'admin') {
      throw new Error('Forbidden');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async remove(@Param('id') id: string, @Request() req) {
    // Only allow users to delete their own account (or admins)
    if (req.user.id !== id && req.user.userType !== 'admin') {
      throw new Error('Forbidden');
    }
    return this.usersService.remove(id);
  }
}
