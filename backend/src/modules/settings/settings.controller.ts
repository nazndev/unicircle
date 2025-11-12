import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public } from '../../common/decorators/public.decorator';
import { MobileApi } from '../../common/decorators/mobile-api.decorator';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @MobileApi()
  @Get('account-types')
  @ApiOperation({ summary: 'Get available account types for onboarding (Mobile API only)' })
  async getAvailableAccountTypes() {
    const accountTypes = await this.settingsService.getAvailableAccountTypes();
    return {
      success: true,
      data: accountTypes,
    };
  }

  @Public()
  @MobileApi()
  @Get('registration-requirements')
  @ApiOperation({ summary: 'Get age limits and terms for registration (Mobile API only, cached)' })
  async getRegistrationRequirements() {
    const requirements = await this.settingsService.getRegistrationRequirements();
    return {
      success: true,
      data: requirements,
    };
  }
}
