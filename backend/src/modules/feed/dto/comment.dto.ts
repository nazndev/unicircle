import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty({ example: 'Great post!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}

