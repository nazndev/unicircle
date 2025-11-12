import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '123 Main Street, Dhaka' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ required: false, example: 23.8103 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false, example: 90.4125 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false, example: '+8801712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Opening hours',
    example: { monday: { open: '09:00', close: '18:00' }, tuesday: { open: '09:00', close: '18:00' } }
  })
  @IsOptional()
  @IsObject()
  schedule?: any;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

