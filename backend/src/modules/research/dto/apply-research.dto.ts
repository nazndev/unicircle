import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyResearchDto {
  @ApiProperty({ description: 'Cover letter explaining interest and qualifications', required: false })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiProperty({ description: 'URL to CV/resume document', required: false })
  @IsOptional()
  @IsString()
  cvUrl?: string;

  @ApiProperty({ description: 'URL to transcript document', required: false })
  @IsOptional()
  @IsString()
  transcriptUrl?: string;
}

