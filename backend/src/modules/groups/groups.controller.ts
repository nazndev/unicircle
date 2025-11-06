import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateGroupDto, JoinGroupDto, SendGroupMessageDto } from './dto';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group/circle' })
  async createGroup(@CurrentUser() user: any, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all groups/circles' })
  async getGroups(@CurrentUser() user: any) {
    return this.groupsService.getGroups(user.userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a group' })
  async joinGroup(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.joinGroup(id, user.userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get group messages' })
  async getGroupMessages(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.getMessages(id, user.userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message to a group' })
  async sendGroupMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SendGroupMessageDto,
  ) {
    return this.groupsService.sendMessage(id, user.userId, dto.content);
  }
}

