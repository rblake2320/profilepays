import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  create(@Request() req, @Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignsService.create(req.user.userId, createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'List of campaigns' })
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get('my-campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaigns for logged-in advertiser' })
  @ApiResponse({ status: 200, description: 'List of user campaigns' })
  findMyCampaigns(@Request() req) {
    return this.campaignsService.findByAdvertiser(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign found' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  update(@Param('id') id: string, @Request() req, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.campaignsService.update(id, req.user.userId, updateCampaignDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.campaignsService.remove(id, req.user.userId);
  }

  @Post(':id/impression')
  @ApiOperation({ summary: 'Track campaign impression' })
  async trackImpression(@Param('id') id: string) {
    await this.campaignsService.incrementImpression(id);
    return { message: 'Impression tracked' };
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Track campaign click' })
  async trackClick(@Param('id') id: string) {
    await this.campaignsService.incrementClick(id);
    return { message: 'Click tracked' };
  }
}
