import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportDto {
  @ApiProperty({ example: 'Suspicious listing' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

