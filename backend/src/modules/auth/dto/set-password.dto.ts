import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPasswordDto {
  @ApiProperty({ description: 'Password (min 6 characters) or PIN (4-6 digits)' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ description: 'Confirm password/PIN' })
  @IsString()
  @MinLength(4)
  confirmPassword: string;
}

