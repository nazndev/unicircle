import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  programme?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  semester?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowCrossCampus?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiProperty({ required: false, type: 'object' })
  @IsOptional()
  experience?: any;

  @ApiProperty({ required: false, type: 'array', items: { type: 'string' } })
  @IsOptional()
  skills?: string[];

  @ApiProperty({ 
    required: false,
    description: 'University ID (teachers can change their university)',
  })
  @IsOptional()
  @IsString()
  universityId?: string;
}

