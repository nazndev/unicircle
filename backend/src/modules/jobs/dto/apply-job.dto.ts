import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyJobDto {
  @ApiProperty({ required: false, example: 'I am interested in this position...' })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}

