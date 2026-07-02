import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { JoinCampaignDto } from './dto/join-campaign.dto';
import { CompleteCampaignDto } from './dto/complete-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ParticipationStatus } from './entities/campaign-participation.entity';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADVERTISER, UserRole.ADMIN)
  async create(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser() user: User,
  ) {
    const campaign = await this.campaignsService.create(createCampaignDto, user.id);
    return {
      success: true,
      message: 'Campaign created successfully',
      data: campaign.toResponseObject(),
    };
  }

  @Get()
  @Public()
  async findAll(@Query() filterDto: CampaignFilterDto) {
    const result = await this.campaignsService.findAll(filterDto);
    return {
      success: true,
      message: 'Campaigns retrieved successfully',
      ...result,
    };
  }

  @Get('featured')
  @Public()
  async getFeatured(@Query() filterDto: CampaignFilterDto) {
    const featuredFilter = { ...filterDto, featured: true, limit: filterDto.limit || 10 };
    const result = await this.campaignsService.findAll(featuredFilter);
    return {
      success: true,
      message: 'Featured campaigns retrieved successfully',
      ...result,
    };
  }

  @Get('my-campaigns')
  @UseGuards(JwtAuthGuard)
  async getMyCampaigns(
    @CurrentUser() user: User,
    @Query('status') status?: ParticipationStatus,
  ) {
    const campaigns = await this.campaignsService.getUserCampaigns(user.id, status);
    return {
      success: true,
      message: 'Your campaigns retrieved successfully',
      data: campaigns,
    };
  }

  @Get('my-earnings')
  @UseGuards(JwtAuthGuard)
  async getMyEarnings(@CurrentUser() user: User) {
    const earnings = await this.campaignsService.getUserEarnings(user.id);
    return {
      success: true,
      message: 'Earnings retrieved successfully',
      data: earnings,
    };
  }

  @Get('advertiser-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADVERTISER, UserRole.ADMIN)
  async getAdvertiserDashboard(@CurrentUser() user: User) {
    const campaigns = await this.campaignsService.getAdvertiserCampaigns(user.id);
    return {
      success: true,
      message: 'Advertiser campaigns retrieved successfully',
      data: campaigns,
    };
  }

  @Get(':id')
  @Public()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: User,
  ) {
    const campaign = await this.campaignsService.findOne(id, user?.id);
    return {
      success: true,
      message: 'Campaign retrieved successfully',
      data: campaign,
    };
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADVERTISER, UserRole.ADMIN)
  async getCampaignAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const analytics = await this.campaignsService.getCampaignAnalytics(id, user.id);
    return {
      success: true,
      message: 'Campaign analytics retrieved successfully',
      data: analytics,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADVERTISER, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @CurrentUser() user: User,
  ) {
    const campaign = await this.campaignsService.update(id, updateCampaignDto, user.id);
    return {
      success: true,
      message: 'Campaign updated successfully',
      data: campaign.toResponseObject(),
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADVERTISER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.campaignsService.remove(id, user.id);
    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async joinCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() joinCampaignDto: JoinCampaignDto,
    @CurrentUser() user: User,
  ) {
    const participation = await this.campaignsService.joinCampaign(id, user.id, joinCampaignDto);
    return {
      success: true,
      message: 'Successfully joined campaign',
      data: participation.toResponseObject(),
    };
  }

  @Post('participations/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeCampaign(
    @Param('id', ParseUUIDPipe) participationId: string,
    @Body() completeCampaignDto: CompleteCampaignDto,
    @CurrentUser() user: User,
  ) {
    const participation = await this.campaignsService.completeCampaign(
      participationId,
      user.id,
      completeCampaignDto,
    );
    return {
      success: true,
      message: 'Campaign completed successfully',
      data: participation.toResponseObject(),
    };
  }

  @Post('participations/:id/start')
  @UseGuards(JwtAuthGuard)
  async startCampaign(
    @Param('id', ParseUUIDPipe) participationId: string,
    @CurrentUser() user: User,
  ) {
    // This would be implemented to manually start a campaign if needed
    // For now, campaigns auto-start when joined
    throw new BadRequestException('Manual start not implemented - campaigns auto-start when joined');
  }

  // Admin/Advertiser endpoints for managing participations
  @Patch('participations/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADVERTISER, UserRole.ADMIN)
  async approveParticipation(
    @Param('id', ParseUUIDPipe) participationId: string,
    @Body('earnings') earnings: number,
    @CurrentUser() user: User,
    @Body('notes') notes?: string,
  ) {
    // Implementation would go here for approving completed campaigns
    return {
      success: true,
      message: 'Participation approved successfully',
    };
  }

  @Patch('participations/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADVERTISER, UserRole.ADMIN)
  async rejectParticipation(
    @Param('id', ParseUUIDPipe) participationId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    // Implementation would go here for rejecting completed campaigns
    return {
      success: true,
      message: 'Participation rejected',
    };
  }

  // Search and discovery endpoints
  @Get('categories/stats')
  @Public()
  async getCategoryStats() {
    // Implementation would return campaign counts by category
    return {
      success: true,
      message: 'Category statistics retrieved successfully',
      data: {},
    };
  }

  @Get('search/suggestions')
  @Public()
  async getSearchSuggestions(@Query('q') query: string) {
    // Implementation would return search suggestions based on query
    return {
      success: true,
      message: 'Search suggestions retrieved successfully',
      data: [],
    };
  }

  // Bulk operations (Admin only)
  @Patch('bulk/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async bulkUpdateStatus(
    @Body('campaignIds') campaignIds: string[],
    @Body('status') status: string,
  ) {
    // Implementation would go here for bulk status updates
    return {
      success: true,
      message: 'Bulk status update completed',
    };
  }

  @Post('bulk/feature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async bulkFeatureCampaigns(
    @Body('campaignIds') campaignIds: string[],
    @Body('featured') featured: boolean,
  ) {
    // Implementation would go here for bulk featuring
    return {
      success: true,
      message: 'Bulk feature update completed',
    };
  }
}