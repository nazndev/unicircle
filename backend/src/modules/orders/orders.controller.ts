import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my orders' })
  async getMyOrders(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getMyOrders(user.userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async getOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.getOrder(id, user.userId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm an order (vendor action)' })
  async confirmOrder(
    @Param('id') id: string,
    @Query('vendorId') vendorId: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.confirmOrder(id, vendorId, user.userId);
  }

  @Post(':id/fulfill')
  @ApiOperation({ summary: 'Fulfill an order (vendor action)' })
  async fulfillOrder(
    @Param('id') id: string,
    @Query('vendorId') vendorId: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.fulfillOrder(id, vendorId, user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancelOrder(id, user.userId, reason);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get orders for a vendor' })
  async getVendorOrders(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getVendorOrders(vendorId, user.userId, status);
  }
}

