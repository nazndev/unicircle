import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendGroupMessageDto {
  @ApiProperty({ example: 'Hello everyone!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}

