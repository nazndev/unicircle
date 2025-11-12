import { IsOptional, IsString, IsBoolean, IsInt, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  programme?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  semester?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, description: 'Mobile number for SMS OTP, notifications, etc.' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false, description: 'For students: expected graduation year' })
  @IsOptional()
  @IsInt()
  passingYear?: number;

  @ApiProperty({ required: false, description: 'For alumni: actual graduation year' })
  @IsOptional()
  @IsInt()
  graduationYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false, type: 'array', items: { type: 'string' }, description: 'Array of interests for matching' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowCrossCampus?: boolean;

  @ApiProperty({ required: false, description: 'For alumni: current job/position' })
  @IsOptional()
  @IsString()
  currentStatus?: string;

  @ApiProperty({ required: false, description: 'Professional headline' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiProperty({ required: false, type: 'object', description: 'For alumni/teachers: work experience' })
  @IsOptional()
  experience?: any;

  @ApiProperty({ required: false, type: 'array', items: { type: 'string' } })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false, description: 'For teachers: research areas/interests' })
  @IsOptional()
  researchInterests?: any;

  @ApiProperty({ 
    required: false,
    description: 'University ID (teachers can change their university)',
  })
  @IsOptional()
  @IsString()
  universityId?: string;

  @ApiProperty({ 
    required: false,
    description: 'Organization ID (professionals can change their organization)',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ 
    required: false,
    description: 'Profile mode (student | professional)',
  })
  @IsOptional()
  @IsString()
  profileMode?: string;

  @ApiProperty({ 
    required: false,
    description: 'Documents for alumni verification (when professional selects university)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiProperty({ 
    required: false,
    description: 'Documents for name verification (office ID, business card, certificate, NID, passport, etc.)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nameVerificationDocuments?: string[];

  @ApiProperty({ required: false, description: 'Personal email address (separate from university/office email)' })
  @IsOptional()
  @IsString()
  personalEmail?: string;

  @ApiProperty({ required: false, description: 'Secondary contact information (phone, email, etc.)' })
  @IsOptional()
  @IsString()
  secondaryContact?: string;
}

