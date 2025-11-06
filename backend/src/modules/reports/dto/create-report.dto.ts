import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  reportedUserId?: string;

  @ApiProperty({ example: 'Inappropriate content' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ 
    required: false,
    enum: ['match', 'chat', 'circle', 'post', 'job', 'marketplace']
  })
  @IsOptional()
  @IsIn(['match', 'chat', 'circle', 'post', 'job', 'marketplace'])
  contextType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contextId?: string;
}

