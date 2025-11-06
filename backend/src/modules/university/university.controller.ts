import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UniversityService } from './university.service';

@ApiTags('university')
@Controller('university')
export class UniversityController {
  constructor(private readonly universityService: UniversityService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active universities' })
  async getAll() {
    return this.universityService.getAll();
  }
}

