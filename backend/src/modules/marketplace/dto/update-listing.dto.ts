import { IsString, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateListingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ 
    required: false, 
    description: 'Additional metadata for opportunities/services (requirements, duration, compensation type, etc.)',
    example: { requirements: 'Must be 2nd year or above', duration: '6 months', compensationType: 'commission' }
  })
  @IsOptional()
  metadata?: any;
}

