import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestCodeDto {
  @ApiProperty({ example: 'student@university.edu' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

