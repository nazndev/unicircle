import { IsString, IsNotEmpty, IsIn, IsOptional, IsNumber, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ enum: ['rent', 'sale'] })
  @IsString()
  @IsIn(['rent', 'sale'])
  type: string;

  @ApiProperty({ enum: ['accommodation', 'electronics', 'books', 'furniture', 'other'] })
  @IsString()
  @IsIn(['accommodation', 'electronics', 'books', 'furniture', 'other'])
  category: string;

  @ApiProperty({ example: 'Room for rent near campus' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Spacious room available...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false, example: 5000 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false, example: 'Dhaka, Bangladesh' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  universityId?: string;

  @ApiProperty({ required: false, type: [String], example: ['https://example.com/img1.jpg'] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false, example: 'Contact: 01234567890' })
  @IsOptional()
  @IsString()
  contactInfo?: string;
}

