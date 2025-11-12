import { IsString, IsNotEmpty, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({ 
    enum: ['marketplace_feature', 'vendor_boost', 'job_posting', 'premium_badge'],
    description: 'Context of the billing'
  })
  @IsString()
  @IsIn(['marketplace_feature', 'vendor_boost', 'job_posting', 'premium_badge'])
  @IsNotEmpty()
  context: string;

  @ApiProperty({ example: 'listing-uuid', description: 'ID of the item being billed' })
  @IsUUID()
  @IsNotEmpty()
  referenceId: string;

  @ApiProperty({ 
    enum: ['mfs', 'card'],
    description: 'Payment method'
  })
  @IsString()
  @IsIn(['mfs', 'card'])
  @IsNotEmpty()
  paymentMethod: string;
}

