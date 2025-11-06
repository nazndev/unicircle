import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'CSE Spring 2025' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, example: 'Group for CSE students' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  universityId?: string;

  @ApiProperty({ required: false, example: 'CSE' })
  @IsOptional()
  @IsString()
  programme?: string;

  @ApiProperty({ enum: ['university', 'programme', 'public'], required: false })
  @IsOptional()
  @IsIn(['university', 'programme', 'public'])
  visibility?: string;
}

