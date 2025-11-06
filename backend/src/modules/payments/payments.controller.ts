import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a payment transaction' })
  async createPayment(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(user.userId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Payment webhook (for payment gateway callbacks)' })
  async webhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }
}

