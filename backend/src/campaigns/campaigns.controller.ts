import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus } from './entities/campaign.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campaign (Business users only)' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async create(@Request() req, @Body() createCampaignDto: CreateCampaignDto) {
    if (req.user.userType !== 'business' && req.user.userType !== 'admin') {
      throw new Error('Only business users can create campaigns');
    }
    return this.campaignsService.create(req.user.id, createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns (paginated)' })
  @ApiResponse({ status: 200, description: 'Returns list of campaigns' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: CampaignStatus,
  ) {
    return this.campaignsService.findAll(page, limit, status);
  }

  @Get('my-campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaigns created by current business user' })
  @ApiResponse({ status: 200, description: 'Returns business campaigns' })
  async findMyCampaigns(@Request() req) {
    return this.campaignsService.findByBusiness(req.user.id);
  }

  @Get('participations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user campaign participations' })
  @ApiResponse({ status: 200, description: 'Returns user participations' })
  async getUserParticipations(@Request() req) {
    return this.campaignsService.getUserParticipations(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Returns campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, req.user.id, updateCampaignDto);
  }

  @Put(':id/status/:status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Param('status') status: CampaignStatus,
    @Request() req,
  ) {
    return this.campaignsService.updateStatus(id, status, req.user.id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a campaign as a member' })
  @ApiResponse({ status: 201, description: 'Successfully joined campaign' })
  async joinCampaign(@Param('id') id: string, @Request() req) {
    return this.campaignsService.joinCampaign(id, req.user.id);
  }

  @Put('participations/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a participation (Business only)' })
  @ApiResponse({ status: 200, description: 'Participation approved' })
  async approveParticipation(@Param('id') id: string, @Request() req) {
    return this.campaignsService.approveParticipation(id, req.user.id);
  }

  @Put('participations/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a participation' })
  @ApiResponse({ status: 200, description: 'Participation completed' })
  async completeParticipation(@Param('id') id: string) {
    return this.campaignsService.completeParticipation(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.campaignsService.remove(id, req.user.id);
  }
}
