import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignsService, CreateCampaignDto, UpdateCampaignDto } from './campaigns.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserType } from '../database/entities/user.entity';
import { CampaignStatus } from '../database/entities/campaign.entity';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // Public: marketplace
  @Get('marketplace')
  @ApiOperation({ summary: 'Get active campaigns for marketplace' })
  async getMarketplace() {
    return this.campaignsService.getMarketplace();
  }

  // Public: platform stats
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  async getStats() {
    return this.campaignsService.getStats();
  }

  // Advertiser: create campaign
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADVERTISER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Advertiser] Create a new campaign' })
  async create(@CurrentUser() user: User, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.id, dto);
  }

  // Advertiser: list own campaigns
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADVERTISER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Advertiser] Get own campaigns' })
  async getMyCampaigns(@CurrentUser() user: User) {
    return this.campaignsService.findAll({ advertiserId: user.id });
  }

  // Advertiser: update campaign
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADVERTISER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Advertiser] Update campaign' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, user.id, dto);
  }

  // Advertiser: activate campaign
  @Put(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADVERTISER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Advertiser] Activate campaign' })
  async activate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.campaignsService.activate(id, user.id);
  }

  // Advertiser: pause campaign
  @Put(':id/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADVERTISER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Advertiser] Pause campaign' })
  async pause(@Param('id') id: string, @CurrentUser() user: User) {
    return this.campaignsService.pause(id, user.id);
  }

  // Advertiser: end campaign
  @Put(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADVERTISER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Advertiser] End campaign' })
  async end(@Param('id') id: string, @CurrentUser() user: User) {
    return this.campaignsService.end(id, user.id);
  }

  // Member: join campaign
  @Post(':id/participate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.MEMBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Member] Join a campaign' })
  async participate(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('platform') platform: string,
  ) {
    return this.campaignsService.participate(id, user.id, platform);
  }

  // Member: submit proof
  @Post('participations/:participationId/proof')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.MEMBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Member] Submit proof of profile picture change' })
  async submitProof(
    @Param('participationId') participationId: string,
    @CurrentUser() user: User,
    @Body('proofScreenshotUrl') proofScreenshotUrl: string,
  ) {
    return this.campaignsService.submitProof(participationId, user.id, proofScreenshotUrl);
  }

  // Get campaign by ID (public)
  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }
}
