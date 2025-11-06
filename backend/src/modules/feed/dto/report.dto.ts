import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportDto {
  @ApiProperty({ example: 'Inappropriate content' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

