import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResearchService } from './research.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOpportunityDto, ApplyResearchDto } from './dto';

@ApiTags('research')
@Controller('research')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a research opportunity (teachers only)' })
  async createOpportunity(@CurrentUser() user: any, @Body() dto: CreateOpportunityDto) {
    return this.researchService.createOpportunity(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get research opportunities' })
  async getOpportunities(
    @CurrentUser() user: any,
    @Query('universityId') universityId?: string,
    @Query('researchArea') researchArea?: string,
    @Query('status') status?: string,
    @Query('allUniversities') allUniversities?: string,
    @Query('allProgrammes') allProgrammes?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.researchService.getOpportunities(user.userId, {
      universityId,
      researchArea,
      status,
      allUniversities: allUniversities === 'true',
      allProgrammes: allProgrammes === 'true',
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific research opportunity' })
  async getOpportunity(@Param('id') id: string, @CurrentUser() user: any) {
    return this.researchService.getOpportunity(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a research opportunity (teacher who created it)' })
  async updateOpportunity(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateOpportunityDto>,
  ) {
    return this.researchService.updateOpportunity(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a research opportunity (teacher who created it)' })
  async deleteOpportunity(@Param('id') id: string, @CurrentUser() user: any) {
    return this.researchService.deleteOpportunity(id, user.userId);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply to a research opportunity (students only)' })
  async applyToOpportunity(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApplyResearchDto,
  ) {
    return this.researchService.applyToOpportunity(id, user.userId, dto);
  }

  @Get('applications/mine')
  @ApiOperation({ summary: 'Get my applications (students) or applications to my opportunities (teachers)' })
  async getApplications(
    @CurrentUser() user: any,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.researchService.getApplications(user.userId, opportunityId);
  }

  @Post('applications/:id/accept')
  @ApiOperation({ summary: 'Accept a research application (teachers only)' })
  async acceptApplication(@Param('id') id: string, @CurrentUser() user: any) {
    return this.researchService.acceptApplication(id, user.userId);
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: 'Reject a research application (teachers only)' })
  async rejectApplication(@Param('id') id: string, @CurrentUser() user: any) {
    return this.researchService.rejectApplication(id, user.userId);
  }
}

