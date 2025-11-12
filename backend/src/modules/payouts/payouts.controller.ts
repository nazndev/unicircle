import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('payouts')
@Controller('payouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run settlement for a vendor (admin only)' })
  @UseGuards(AdminGuard)
  async runSettlement(
    @Query('vendorId') vendorId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.payoutsService.runSettlement(
      vendorId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }

  @Post(':id/disburse')
  @ApiOperation({ summary: 'Disburse a payout (admin only)' })
  @UseGuards(AdminGuard)
  async disbursePayout(
    @Param('id') id: string,
    @Query('transactionId') transactionId: string,
  ) {
    return this.payoutsService.disbursePayout(id, transactionId);
  }

  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'Mark payout as paid (admin only)' })
  @UseGuards(AdminGuard)
  async markPayoutPaid(@Param('id') id: string) {
    return this.payoutsService.markPayoutPaid(id);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get payouts for a vendor' })
  async getVendorPayouts(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: any,
  ) {
    return this.payoutsService.getVendorPayouts(vendorId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout details' })
  async getPayout(@Param('id') id: string, @CurrentUser() user: any) {
    return this.payoutsService.getPayout(id, user.userId);
  }

  @Get('vendor/:vendorId/statements')
  @ApiOperation({ summary: 'Get vendor statement for a month (format: YYYY-MM)' })
  async getVendorStatement(
    @Param('vendorId') vendorId: string,
    @Query('month') month: string,
    @CurrentUser() user: any,
  ) {
    return this.payoutsService.getVendorStatement(vendorId, user.userId, month);
  }
}

