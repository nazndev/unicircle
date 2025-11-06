import { IsString, IsIn, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileModeDto {
  @ApiProperty({ enum: ['student', 'alumni', 'professional'] })
  @IsString()
  @IsIn(['student', 'alumni', 'professional'])
  profileMode: string;

  @ApiProperty({ 
    required: false,
    description: 'Documents required when switching to alumni mode (for manual registration)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  documents?: string[];
}

