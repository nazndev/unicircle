import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'Hello UniCircle!' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiProperty({ enum: ['university', 'programme', 'public'], required: false })
  @IsOptional()
  @IsIn(['university', 'programme', 'public'])
  visibility?: string;
}

