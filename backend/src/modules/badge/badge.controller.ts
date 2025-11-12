import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BadgeService } from './badge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('badges')
@Controller('badges')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Get()
  @ApiOperation({ summary: 'Get all badges for current user' })
  async getMyBadges(@CurrentUser() user: any) {
    return this.badgeService.getUserBadges(user.userId);
  }

  @Get('verified')
  @ApiOperation({ summary: 'Get all verified badges for current user' })
  async getMyVerifiedBadges(@CurrentUser() user: any) {
    return this.badgeService.getVerifiedBadges(user.userId);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all available badge types' })
  async getAvailableBadgeTypes(@CurrentUser() user: any) {
    const profileMode = user?.profileMode || 'student';
    return this.badgeService.getAvailableBadgeTypes(profileMode);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a badge to current user (unverified by default)' })
  async addBadge(
    @CurrentUser() user: any,
    @Body() dto: { badgeType: string; documents?: any[]; metadata?: any },
  ) {
    return this.badgeService.addBadge(user.userId, dto.badgeType, dto.documents, dto.metadata);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update badge documents/metadata (only unverified badges)' })
  async updateBadge(
    @CurrentUser() user: any,
    @Param('id') badgeId: string,
    @Body() dto: { documents?: any[]; metadata?: any },
  ) {
    return this.badgeService.updateBadge(user.userId, badgeId, dto.documents, dto.metadata);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a badge (only unverified badges)' })
  async removeBadge(@CurrentUser() user: any, @Param('id') badgeId: string) {
    return this.badgeService.removeBadge(user.userId, badgeId);
  }

  @Get('check/:badgeType')
  @ApiOperation({ summary: 'Check if user has a specific badge' })
  async checkBadge(
    @CurrentUser() user: any,
    @Param('badgeType') badgeType: string,
    @Body() dto?: { verifiedOnly?: boolean },
  ) {
    const hasBadge = await this.badgeService.hasBadge(user.userId, badgeType, dto?.verifiedOnly || false);
    return { hasBadge, badgeType };
  }
}

