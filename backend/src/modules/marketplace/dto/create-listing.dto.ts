import { IsString, IsNotEmpty, IsIn, IsOptional, IsNumber, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ 
    enum: ['rent', 'sale', 'opportunity', 'service'],
    description: 'Type of listing: rent (accommodation), sale (items), opportunity (distribution/entrepreneurship/campus roles), service (tutoring/freelancing)'
  })
  @IsString()
  @IsIn(['rent', 'sale', 'opportunity', 'service'])
  type: string;

  @ApiProperty({ 
    enum: [
      'accommodation',      // Room/seat/hostel/sublet
      'flatmate_wanted',    // Find people to share
      'electronics',        // Laptop, phone, gadgets
      'books',              // Textbooks, novels
      'furniture',          // Furniture items
      'distribution',       // Distribution network opportunities
      'entrepreneurship',   // Business/startup opportunities
      'campus_opportunity', // Campus roles (moderator, event organizer, etc.)
      'services',           // Tutoring, freelancing, consulting
      'events',             // Event tickets, workshops
      'other'               // Other items/opportunities
    ],
    description: 'Category of the listing'
  })
  @IsString()
  @IsIn(['accommodation', 'flatmate_wanted', 'electronics', 'books', 'furniture', 'distribution', 'entrepreneurship', 'campus_opportunity', 'services', 'events', 'other'])
  category: string;

  @ApiProperty({ example: 'Room for rent near campus' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Spacious room available...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false, example: 5000 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false, example: 'Dhaka, Bangladesh' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  universityId?: string;

  @ApiProperty({ required: false, type: [String], example: ['https://example.com/img1.jpg'] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false, example: 'Contact: 01234567890' })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Additional metadata for opportunities/services (requirements, duration, compensation type, etc.)',
    example: { requirements: 'Must be 2nd year or above', duration: '6 months', compensationType: 'commission' }
  })
  @IsOptional()
  metadata?: any;
}

