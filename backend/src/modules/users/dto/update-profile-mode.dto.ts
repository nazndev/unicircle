import { IsString, IsIn, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileModeDto {
  @ApiProperty({ enum: ['student', 'professional'] })
  @IsString()
  @IsIn(['student', 'professional'])
  profileMode: string;

  @ApiProperty({ 
    required: false,
    description: 'Documents required for alumni verification (when directly registering as teacher/professional without student history)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  documents?: string[];

  @ApiProperty({ 
    required: false,
    description: 'University ID (required when switching to teacher or directly registering as teacher/professional)',
  })
  @IsOptional()
  @IsString()
  universityId?: string;

  @ApiProperty({ 
    required: false,
    description: 'Organization ID (required when switching to professional, must be verified via office email)',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ 
    required: false,
    description: 'Office email for professional verification (must be whitelisted organization domain)',
  })
  @IsOptional()
  @IsString()
  officeEmail?: string;
}

