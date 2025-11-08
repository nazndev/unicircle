import { IsString, IsIn, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileModeDto {
  @ApiProperty({ enum: ['student', 'alumni', 'teacher'] })
  @IsString()
  @IsIn(['student', 'alumni', 'teacher'])
  profileMode: string;

  @ApiProperty({ 
    required: false,
    description: 'Documents required when switching to alumni/teacher mode (for manual registration)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  documents?: string[];

  @ApiProperty({ 
    required: false,
    description: 'University ID (required when switching to teacher, optional for alumni)',
  })
  @IsOptional()
  @IsString()
  universityId?: string;
}

