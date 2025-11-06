import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCrushDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  @IsNotEmpty()
  toUserId: string;
}

