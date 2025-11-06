import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SendMessageDto } from './dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':matchId')
  @ApiOperation({ summary: 'Get chat messages for a match' })
  async getMessages(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.chatService.getMessages(matchId, user.userId, parseInt(page), parseInt(limit));
  }

  @Post(':matchId')
  @ApiOperation({ summary: 'Send a message in a match' })
  async sendMessage(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(matchId, user.userId, dto.content);
  }
}

