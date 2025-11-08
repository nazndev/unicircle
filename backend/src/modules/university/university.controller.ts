import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UniversityService } from './university.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('university')
@Controller('university')
export class UniversityController {
  constructor(private readonly universityService: UniversityService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active universities' })
  @ApiQuery({ name: 'countryId', required: false, description: 'Filter by country ID' })
  async getAll(@Query('countryId') countryId?: string) {
    return this.universityService.getAll(countryId);
  }

  @Public()
  @Get('countries')
  @ApiOperation({ summary: 'Get all countries with active universities' })
  async getCountries() {
    return this.universityService.getCountries();
  }

  @Public()
  @Get('check-domain')
  @ApiOperation({ summary: 'Check if email domain belongs to a registered university' })
  @ApiQuery({ name: 'domain', required: true, description: 'Email domain (e.g., northsouth.edu)' })
  async checkDomain(@Query('domain') domain: string) {
    const university = await this.universityService.getByDomain(domain);
    if (!university) {
      return { found: false };
    }
    return { found: true, university };
  }
}

