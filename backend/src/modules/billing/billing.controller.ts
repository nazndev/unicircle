import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckoutDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get pricing plans' })
  @Public()
  async getPricingPlans() {
    return this.billingService.getPricingPlans();
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create invoice and payment intent' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async checkout(@CurrentUser() user: any, @Body() dto: CheckoutDto) {
    return this.billingService.checkout(user.userId, dto);
  }

  @Get('invoices/me')
  @ApiOperation({ summary: 'Get my invoices' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyInvoices(@CurrentUser() user: any) {
    return this.billingService.getMyInvoices(user.userId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    return this.billingService.getInvoice(id, user.userId);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Get invoice PDF' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getInvoicePDF(@Param('id') id: string, @CurrentUser() user: any) {
    return this.billingService.getInvoicePDF(id, user.userId);
  }

  @Post('invoices/:id/mark-paid')
  @ApiOperation({ summary: 'Mark invoice as paid (webhook handler)' })
  @Public()
  async markInvoicePaid(@Param('id') id: string) {
    return this.billingService.markInvoicePaid(id);
  }
}

