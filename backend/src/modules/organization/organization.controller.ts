import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { Public } from '../../common/decorators/public.decorator';
import { MobileApi } from '../../common/decorators/mobile-api.decorator';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Public()
  @MobileApi()
  @Get()
  @ApiOperation({ summary: 'Get all active organizations (Mobile API only)' })
  @ApiQuery({ name: 'countryId', required: false, description: 'Filter by country ID' })
  async getAll(@Query('countryId') countryId?: string) {
    return this.organizationService.getAll(countryId);
  }

  @Public()
  @MobileApi()
  @Get('check-domain')
  @ApiOperation({ summary: 'Check if email domain belongs to a registered organization (Mobile API only)' })
  @ApiQuery({ name: 'domain', required: true, description: 'Email domain (e.g., bat.com)' })
  async checkDomain(@Query('domain') domain: string) {
    const organization = await this.organizationService.getByDomain(domain);
    if (!organization) {
      return { found: false };
    }
    return { found: true, organization };
  }
}

