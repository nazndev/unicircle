import { Controller, Get, Post, Param, UseGuards, Put, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('alumni-requests')
  @ApiOperation({ summary: 'Get pending alumni approval requests' })
  async getAlumniRequests(@CurrentUser() user: any) {
    return this.adminService.getAlumniRequests(user.userId);
  }

  @Post('alumni-requests/:id/approve')
  @ApiOperation({ summary: 'Approve an alumni request' })
  async approveAlumni(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.approveAlumni(id, user.userId);
  }

  @Post('alumni-requests/:id/reject')
  @ApiOperation({ summary: 'Reject an alumni request' })
  async rejectAlumni(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.rejectAlumni(id, user.userId);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get all reports' })
  async getReports(@CurrentUser() user: any) {
    return this.adminService.getReports(user.userId);
  }

  @Post('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve a report' })
  async resolveReport(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.resolveReport(id, user.userId);
  }

  @Put('users/:id/block')
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.blockUser(id, user.userId);
  }

  @Put('posts/:id/hide')
  @ApiOperation({ summary: 'Hide a post' })
  async hidePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.hidePost(id, user.userId);
  }

  @Put('marketplace/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a marketplace listing' })
  async deactivateListing(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.deactivateListing(id, user.userId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get admin metrics' })
  async getMetrics(@CurrentUser() user: any) {
    return this.adminService.getMetrics(user.userId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (paginated)' })
  async getUsers(
    @CurrentUser() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.adminService.getUsers(user.userId, parseInt(page), parseInt(limit));
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  async getSettings(@CurrentUser() user: any) {
    return this.adminService.getSettings(user.userId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(@CurrentUser() user: any, @Body() settings: any) {
    return this.adminService.updateSettings(user.userId, settings);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(
    @CurrentUser() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.adminService.getAuditLogs(user.userId, parseInt(page), parseInt(limit));
  }
}
