import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrushService } from './crush.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SendCrushDto } from './dto';

@ApiTags('crush')
@Controller('crush')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrushController {
  constructor(private readonly crushService: CrushService) {}

  @Post()
  @ApiOperation({ summary: 'Send a crush' })
  async sendCrush(@CurrentUser() user: any, @Body() dto: SendCrushDto) {
    return this.crushService.sendCrush(user.userId, dto.toUserId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my crushes (sent and received)' })
  async getMyCrushes(@CurrentUser() user: any) {
    return this.crushService.getMyCrushes(user.userId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending crushes' })
  async getPendingCrushes(@CurrentUser() user: any) {
    return this.crushService.getPendingCrushes(user.userId);
  }
}

