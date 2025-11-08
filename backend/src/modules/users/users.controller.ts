import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto, UpdateProfileModeDto } from './dto';

@ApiTags('users')
@Controller('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Put('profile-mode')
  @ApiOperation({ summary: 'Change profile mode (student → alumni → professional)' })
  async updateProfileMode(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileModeDto,
  ) {
    return this.usersService.updateProfileMode(user.userId, dto);
  }

  @Put('complete-onboarding')
  @ApiOperation({ summary: 'Mark onboarding as completed' })
  async completeOnboarding(@CurrentUser() user: any) {
    return this.usersService.completeOnboarding(user.userId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete account (self-service)' })
  async deleteAccount(@CurrentUser() user: any) {
    return this.usersService.deleteAccount(user.userId);
  }

  @Get('features')
  @ApiOperation({ summary: 'Get enabled features for current user profile mode' })
  async getProfileFeatures(@CurrentUser() user: any) {
    return this.usersService.getProfileFeatures(user.userId);
  }
}

