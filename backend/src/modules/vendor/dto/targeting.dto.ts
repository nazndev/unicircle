import { IsArray, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TargetingDto {
  @ApiProperty({ type: [String], description: 'Array of university IDs to target' })
  @IsArray()
  @IsUUID('4', { each: true })
  universityIds: string[];

  @ApiProperty({ required: false, description: 'Geographic radius in kilometers' })
  @IsOptional()
  @IsNumber()
  geoRadius?: number;
}

