import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateJobDto, ApplyJobDto } from './dto';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a job posting' })
  async createJob(@CurrentUser() user: any, @Body() dto: CreateJobDto) {
    return this.jobsService.createJob(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get job listings' })
  async getJobs(
    @CurrentUser() user: any,
    @Query('programme') programme?: string,
    @Query('universityId') universityId?: string,
  ) {
    return this.jobsService.getJobs(user.userId, { programme, universityId });
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply to a job' })
  async applyJob(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobsService.applyJob(id, user.userId, dto);
  }

  @Get('applications/mine')
  @ApiOperation({ summary: 'Get my job applications' })
  async getMyApplications(@CurrentUser() user: any) {
    return this.jobsService.getMyApplications(user.userId);
  }
}

