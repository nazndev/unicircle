import { IsString, IsNotEmpty, IsNumber, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ enum: ['marketplace', 'job', 'premium'] })
  @IsString()
  @IsIn(['marketplace', 'job', 'premium'])
  context: string;

  @ApiProperty({ example: 'listing-id-123' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ example: 100.0 })
  @IsNumber()
  amount: number;
}

