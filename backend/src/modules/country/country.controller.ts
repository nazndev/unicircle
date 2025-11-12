import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CountryService } from './country.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('country')
@Controller('country')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  /**
   * Get active countries (public)
   */
  @Get('active')
  @ApiOperation({ summary: 'Get all active countries (public)' })
  async getActive() {
    return {
      success: true,
      data: await this.countryService.getActive(),
    };
  }

  /**
   * Get all countries (admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all countries (admin only)' })
  async getAll(@Query('activeOnly') activeOnly?: string) {
    const activeOnlyBool = activeOnly === 'true';
    return {
      success: true,
      data: await this.countryService.getAll(activeOnlyBool),
    };
  }

  /**
   * Get country by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get country by ID' })
  async getById(@Param('id') id: string) {
    return {
      success: true,
      data: await this.countryService.getById(id),
    };
  }

  /**
   * Create country (admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new country (admin only)' })
  async create(@Body() data: { name: string; code?: string; active?: boolean }) {
    return {
      success: true,
      data: await this.countryService.create(data),
    };
  }

  /**
   * Update country (admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update country (admin only)' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; code?: string; active?: boolean },
  ) {
    return {
      success: true,
      data: await this.countryService.update(id, data),
    };
  }

  /**
   * Activate/Deactivate country (admin only)
   */
  @Put(':id/active')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or deactivate country (admin only)' })
  async setActive(
    @Param('id') id: string,
    @Body() data: { active: boolean },
  ) {
    return {
      success: true,
      data: await this.countryService.setActive(id, data.active),
    };
  }

  /**
   * Delete country (admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete country (admin only)' })
  async delete(@Param('id') id: string) {
    await this.countryService.delete(id);
    return {
      success: true,
      message: 'Country deleted successfully',
    };
  }
}

