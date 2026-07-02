import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserType, SubscriptionTier } from '../database/entities/user.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('fees')
  @ApiOperation({ summary: 'Get fee structure and subscription pricing' })
  getFees() {
    return this.paymentsService.getFeeInfo();
  }

  @Post('intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADVERTISER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Advertiser] Create payment intent to fund campaign' })
  async createPaymentIntent(
    @CurrentUser() user: User,
    @Body('amount') amount: number,
  ) {
    return this.paymentsService.createPaymentIntent(user.id, amount);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan tier' })
  async subscribe(
    @CurrentUser() user: User,
    @Body('tier') tier: SubscriptionTier,
  ) {
    return this.paymentsService.createSubscription(user.id, tier);
  }

  @Post('payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.MEMBER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Member] Request wallet payout' })
  async requestPayout(@CurrentUser() user: User) {
    return this.paymentsService.requestPayout(user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }
}
