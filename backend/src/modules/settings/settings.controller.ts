import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('account-types')
  @ApiOperation({ summary: 'Get available account types for onboarding' })
  async getAvailableAccountTypes() {
    const accountTypes = await this.settingsService.getAvailableAccountTypes();
    return {
      success: true,
      data: accountTypes,
    };
  }
}

