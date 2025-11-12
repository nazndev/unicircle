import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 'Campus Meal Deal' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, example: 'Delicious meal combo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    enum: ['local_business', 'promos', 'services_pro', 'other'],
    description: 'Category of the item'
  })
  @IsString()
  @IsIn(['local_business', 'promos', 'services_pro', 'other'])
  category: string;

  @ApiProperty({ required: false, example: 150 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @IsNumber()
  stockQty?: number;

  @ApiProperty({ required: false, type: [String], example: ['https://example.com/img1.jpg'] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ 
    enum: ['pickup', 'delivery', 'service_booking', 'coupon'],
    default: 'pickup',
    description: 'Fulfillment type'
  })
  @IsString()
  @IsIn(['pickup', 'delivery', 'service_booking', 'coupon'])
  @IsOptional()
  fulfillmentType?: string;

  @ApiProperty({ required: false, description: 'Booking schedule for services' })
  @IsOptional()
  schedule?: any;

  @ApiProperty({ required: false, type: [String], description: 'Array of university IDs for campus coverage' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  campusCoverage?: string[];

  @ApiProperty({ required: false, description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

