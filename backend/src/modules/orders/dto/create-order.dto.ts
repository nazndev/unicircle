import { IsString, IsNotEmpty, IsIn, IsOptional, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'item-uuid' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 2 })
  @IsNotEmpty()
  qty: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'vendor-uuid' })
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({ type: [OrderItemDto], description: 'Items to order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ 
    enum: ['cod', 'mfs', 'card', 'prepaid_token'],
    default: 'cod',
    description: 'Payment method'
  })
  @IsString()
  @IsIn(['cod', 'mfs', 'card', 'prepaid_token'])
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false, description: 'Delivery address or pickup point; optional for service_booking' })
  @IsOptional()
  @IsString()
  deliveryInfo?: string;

  @ApiProperty({ required: false, description: 'ISO 8601 interval or time slot id for service_booking' })
  @IsOptional()
  @IsString()
  bookingSlot?: string;

  @ApiProperty({ required: false, description: 'Additional order metadata' })
  @IsOptional()
  metadata?: any;
}

