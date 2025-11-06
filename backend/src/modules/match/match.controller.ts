import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchService } from './match.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('match')
@Controller('match')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Get all my matches' })
  async getMyMatches(@CurrentUser() user: any) {
    return this.matchService.getMyMatches(user.userId);
  }
}

