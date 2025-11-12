import { IsString, IsNotEmpty, IsEmail, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyVendorDto {
  @ApiProperty({ example: 'Campus Food Court' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  proprietorName: string;

  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+8801712345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false, example: 'TR-12345' })
  @IsOptional()
  @IsString()
  tradeLicenseOrNID?: string;

  @ApiProperty({ required: false, description: 'KYC documents (trade license, NID, bank statement)' })
  @IsOptional()
  @IsObject()
  documents?: any;

  @ApiProperty({ required: false, description: 'Bank or MFS account details for payouts' })
  @IsOptional()
  @IsObject()
  bankAccount?: any;
}

