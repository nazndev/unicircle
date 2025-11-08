import { IsEmail, IsNotEmpty, IsString, IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TeacherRegisterDto {
  @ApiProperty({ example: 'Dr. Jane Smith' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'jane.smith@university.edu' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'uuid-of-university' })
  @IsUUID()
  @IsNotEmpty()
  universityId: string;

  @ApiProperty({ example: 'Computer Science', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ 
    example: ['https://example.com/faculty-id.pdf', 'https://example.com/appointment-letter.pdf'],
    description: 'Array of document URLs (faculty ID, appointment letter, university verification)'
  })
  @IsArray()
  @IsOptional()
  documents?: string[];
}

