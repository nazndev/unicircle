import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello! How are you?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}

