import { IsEmail, IsNotEmpty, IsString, IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AlumniRegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  personalEmail: string;

  @ApiProperty({ example: 'uuid-of-university' })
  @IsUUID()
  @IsNotEmpty()
  universityId: string;

  @ApiProperty({ 
    example: ['https://example.com/doc1.pdf', 'https://example.com/doc2.jpg'],
    description: 'Array of document URLs (uploaded separately)'
  })
  @IsArray()
  @IsOptional()
  documents?: string[];
}

