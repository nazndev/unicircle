import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePostDto, CommentDto, ReportDto } from './dto';

@ApiTags('feed')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post()
  @ApiOperation({ summary: 'Create a post' })
  async createPost(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.feedService.createPost(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get posts feed' })
  async getPosts(
    @CurrentUser() user: any,
    @Query('scope') scope: string = 'university',
    @Query('page') page: string = '1',
  ) {
    return this.feedService.getPosts(user.userId, scope, parseInt(page));
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a post' })
  async likePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.feedService.likePost(id, user.userId);
  }

  @Post(':id/comment')
  @ApiOperation({ summary: 'Comment on a post' })
  async commentPost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CommentDto,
  ) {
    return this.feedService.commentPost(id, user.userId, dto.content);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report a post' })
  async reportPost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReportDto,
  ) {
    return this.feedService.reportPost(id, user.userId, dto.reason);
  }
}
