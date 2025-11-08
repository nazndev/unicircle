import { IsString, IsOptional, IsArray, IsNumber, IsIn, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOpportunityDto {
  @ApiProperty({ description: 'Research opportunity title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description of the research opportunity' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Research area (e.g., AI, Biology, Economics)' })
  @IsString()
  researchArea: string;

  @ApiProperty({ 
    description: 'Requirements (JSON object with skills, prerequisites, GPA, yearOfStudy)',
    required: false,
    type: 'object'
  })
  @IsOptional()
  requirements?: any;

  @ApiProperty({ description: 'Duration (e.g., "6 months", "1 year")', required: false })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiProperty({ description: 'Location (on-campus | remote | hybrid)' })
  @IsString()
  @IsIn(['on-campus', 'remote', 'hybrid'])
  location: string;

  @ApiProperty({ description: 'Compensation (stipend amount, "credit", or "unpaid")', required: false })
  @IsOptional()
  @IsString()
  compensation?: string;

  @ApiProperty({ description: 'University ID where research is conducted' })
  @IsString()
  universityId: string;

  @ApiProperty({ 
    description: 'Target universities (for cross-university opportunities)',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUniversities?: string[];

  @ApiProperty({ 
    description: 'Target programmes (optional: specific programmes)',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetProgrammes?: string[];

  @ApiProperty({ description: 'Maximum number of applicants', required: false })
  @IsOptional()
  @IsNumber()
  maxApplicants?: number;
}

