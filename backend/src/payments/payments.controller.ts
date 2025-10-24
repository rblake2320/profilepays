import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentType } from './entities/payment.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent for Stripe' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createPaymentIntent(
    @Request() req,
    @Body() body: { amount: number; type: PaymentType; metadata?: any },
  ) {
    return this.paymentsService.createPaymentIntent(
      req.user.id,
      body.amount,
      body.type,
      body.metadata,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody;
    return this.paymentsService.handleWebhook(signature, payload);
  }

  @Post('payout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a payout of earnings' })
  @ApiResponse({ status: 201, description: 'Payout processed' })
  async processPayout(@Request() req, @Body() body: { amount: number }) {
    return this.paymentsService.processPayout(req.user.id, body.amount);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user payment history' })
  @ApiResponse({ status: 200, description: 'Returns payment history' })
  async getUserPayments(@Request() req) {
    return this.paymentsService.getUserPayments(req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all payments' })
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    if (req.user.userType !== 'admin') {
      throw new Error('Forbidden');
    }
    return this.paymentsService.findAll(page, limit);
  }
}
