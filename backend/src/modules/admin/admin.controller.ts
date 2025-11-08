import { Controller, Get, Post, Param, UseGuards, Put, Query, Body, Delete } from '@nestjs/common';
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

  @Get('teacher-requests')
  @ApiOperation({ summary: 'Get pending teacher approval requests' })
  async getTeacherRequests(@CurrentUser() user: any) {
    return this.adminService.getTeacherRequests(user.userId);
  }

  @Post('teacher-requests/:id/approve')
  @ApiOperation({ summary: 'Approve teacher request' })
  async approveTeacher(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.approveTeacher(id, user.userId);
  }

  @Post('teacher-requests/:id/reject')
  @ApiOperation({ summary: 'Reject teacher request' })
  async rejectTeacher(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.rejectTeacher(id, user.userId);
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
    const settings = await this.adminService.getSettings(user.userId);
    // Remove any fields that don't exist in the schema
    const { allowedCountries, ...cleanSettings } = settings as any;
    console.log('[ADMIN CONTROLLER] getSettings - Raw settings:', JSON.stringify(settings, null, 2));
    console.log('[ADMIN CONTROLLER] getSettings - Account type flags:', {
      enableStudentRegistration: (settings as any)?.enableStudentRegistration,
      enableAlumniRegistration: (settings as any)?.enableAlumniRegistration,
      enableTeacherRegistration: (settings as any)?.enableTeacherRegistration,
    });
    return {
      success: true,
      data: cleanSettings,
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(@CurrentUser() user: any, @Body() settings: any) {
    // Remove allowedCountries if present (no longer in schema)
    const { allowedCountries, ...cleanSettings } = settings;
    console.log('[ADMIN] Updating settings with:', JSON.stringify(cleanSettings, null, 2));
    const result = await this.adminService.updateSettings(user.userId, cleanSettings);
    console.log('[ADMIN] Settings updated successfully:', JSON.stringify(result, null, 2));
    return {
      success: true,
      data: result,
    };
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

  @Post('universities')
  @ApiOperation({ summary: 'Create a new university' })
  async createUniversity(@CurrentUser() user: any, @Body() data: any) {
    return this.adminService.createUniversity(user.userId, data);
  }

  @Put('universities/:id')
  @ApiOperation({ summary: 'Update a university' })
  async updateUniversity(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.adminService.updateUniversity(user.userId, id, data);
  }

  @Delete('universities/:id')
  @ApiOperation({ summary: 'Delete a university' })
  async deleteUniversity(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.deleteUniversity(user.userId, id);
  }

  @Get('university-requests')
  @ApiOperation({ summary: 'Get all university requests' })
  async getUniversityRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUniversityRequests(user.userId, status);
  }

  @Post('university-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a university request and create university' })
  async approveUniversityRequest(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.approveUniversityRequest(user.userId, id);
  }

  @Post('university-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a university request' })
  async rejectUniversityRequest(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.rejectUniversityRequest(user.userId, id);
  }

  @Post('cleanup-stuck-users')
  @ApiOperation({ summary: 'Clean up stuck users (users who never received emails or completed verification)' })
  async cleanupStuckUsers(@CurrentUser() user: any) {
    return this.adminService.cleanupStuckUsers(user.userId);
  }
}
