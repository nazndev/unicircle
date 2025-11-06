import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'We are looking for a skilled software engineer...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false, example: 'Full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiProperty({ required: false, example: 'Dhaka, Bangladesh' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  targetUniversityId?: string;

  @ApiProperty({ required: false, example: 'CSE' })
  @IsOptional()
  @IsString()
  targetProgramme?: string;
}

