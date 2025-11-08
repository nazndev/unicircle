import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOpportunityDto, ApplyResearchDto } from './dto';

@Injectable()
export class ResearchService {
  constructor(private prisma: PrismaService) {}

  async createOpportunity(userId: string, dto: CreateOpportunityDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    });

    if (!user || user.isBlocked) {
      throw new ForbiddenException('User not found or blocked');
    }

    // Only teachers can create research opportunities
    if (user.profileMode !== 'teacher') {
      throw new ForbiddenException('Only teachers can create research opportunities');
    }

    if (!user.isVerified || user.verificationStatus !== 'approved') {
      throw new ForbiddenException('Teacher account must be verified to publish research opportunities');
    }

    // Verify university exists
    const university = await this.prisma.university.findUnique({
      where: { id: dto.universityId },
    });

    if (!university || !university.active) {
      throw new BadRequestException('Invalid or inactive university');
    }

    return (this.prisma as any).researchOpportunity.create({
      data: {
        title: dto.title,
        description: dto.description,
        researchArea: dto.researchArea,
        requirements: dto.requirements || null,
        duration: dto.duration || null,
        location: dto.location,
        compensation: dto.compensation || null,
        teacherId: userId,
        universityId: dto.universityId,
        targetUniversities: dto.targetUniversities || [],
        targetProgrammes: dto.targetProgrammes || [],
        maxApplicants: dto.maxApplicants || null,
        status: 'open',
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            university: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });
  }

  async getOpportunities(userId: string, filters: any = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get settings to check cross-university research
    const settings = await (this.prisma.settings.findUnique({
      where: { id: 'platform' },
    }) as Promise<any>);

    const allowCrossUniversity = settings?.enableCrossUniversityResearch ?? true;

    // Build where clause
    const where: any = {
      status: filters.status || 'open',
    };

    // Filter by research area
    if (filters.researchArea) {
      where.researchArea = filters.researchArea;
    }

    // Filter by university
    if (filters.universityId) {
      where.universityId = filters.universityId;
    } else if (!allowCrossUniversity && user.universityId) {
      // If cross-university is disabled, only show opportunities from user's university
      where.universityId = user.universityId;
    } else if (user.universityId && !filters.allUniversities) {
      // Default: show user's university + cross-university if enabled
      where.OR = [
        { universityId: user.universityId },
        { targetUniversities: { has: user.universityId } },
        ...(allowCrossUniversity ? [{ targetUniversities: { isEmpty: true } }] : []),
      ];
    }

    // Filter by target programmes if user has a programme
    if (user.programme && !filters.allProgrammes) {
      where.OR = [
        ...(where.OR || []),
        { targetProgrammes: { has: user.programme } },
        { targetProgrammes: { isEmpty: true } },
      ];
    }

    return (this.prisma as any).researchOpportunity.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            avatarUrl: true,
            university: {
              select: {
                id: true,
                name: true,
                country: true,
              },
            },
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.skip || 0,
    });
  }

  async getOpportunity(id: string, userId: string) {
    const opportunity = await (this.prisma as any).researchOpportunity.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            avatarUrl: true,
            headline: true,
            researchInterests: true,
            university: {
              select: {
                id: true,
                name: true,
                country: true,
              },
            },
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        applications: {
          where: {
            studentId: userId,
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Research opportunity not found');
    }

    return opportunity;
  }

  async updateOpportunity(id: string, userId: string, dto: Partial<CreateOpportunityDto>) {
    const opportunity = await (this.prisma as any).researchOpportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Research opportunity not found');
    }

    if (opportunity.teacherId !== userId) {
      throw new ForbiddenException('Only the teacher who created this opportunity can update it');
    }

    return (this.prisma as any).researchOpportunity.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.researchArea && { researchArea: dto.researchArea }),
        ...(dto.requirements !== undefined && { requirements: dto.requirements }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.location && { location: dto.location }),
        ...(dto.compensation !== undefined && { compensation: dto.compensation }),
        ...(dto.targetUniversities && { targetUniversities: dto.targetUniversities }),
        ...(dto.targetProgrammes && { targetProgrammes: dto.targetProgrammes }),
        ...(dto.maxApplicants !== undefined && { maxApplicants: dto.maxApplicants }),
        // Status is managed separately (open/closed/filled) - not part of update DTO
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteOpportunity(id: string, userId: string) {
    const opportunity = await (this.prisma as any).researchOpportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Research opportunity not found');
    }

    if (opportunity.teacherId !== userId) {
      throw new ForbiddenException('Only the teacher who created this opportunity can delete it');
    }

    await (this.prisma as any).researchOpportunity.delete({
      where: { id },
    });

    return { message: 'Research opportunity deleted successfully' };
  }

  async applyToOpportunity(opportunityId: string, userId: string, dto: ApplyResearchDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isBlocked) {
      throw new ForbiddenException('User not found or blocked');
    }

    // Only students can apply (alumni can be enabled in settings)
    if (user.profileMode !== 'student') {
      // Check if alumni can apply (from settings)
      const settings = await (this.prisma.settings.findUnique({
        where: { id: 'platform' },
      }) as Promise<any>);

      const alumniFeatures = (settings?.alumniFeatures as any) || {};
      if (user.profileMode === 'alumni' && !alumniFeatures.research) {
        throw new ForbiddenException('Research applications are not enabled for alumni');
      }
    }

    const opportunity = await (this.prisma as any).researchOpportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Research opportunity not found');
    }

    if (opportunity.status !== 'open') {
      throw new BadRequestException('This research opportunity is no longer accepting applications');
    }

    // Check if already applied
    const existingApplication = await (this.prisma as any).researchApplication.findUnique({
      where: {
        opportunityId_studentId: {
          opportunityId,
          studentId: userId,
        },
      },
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied to this research opportunity');
    }

    // Check max applicants
    if (opportunity.maxApplicants) {
      const applicationCount = await (this.prisma as any).researchApplication.count({
        where: {
          opportunityId,
          status: { in: ['pending', 'accepted'] },
        },
      });

      if (applicationCount >= opportunity.maxApplicants) {
        throw new BadRequestException('This research opportunity has reached maximum applicants');
      }
    }

    return (this.prisma as any).researchApplication.create({
      data: {
        opportunityId,
        studentId: userId,
        coverLetter: dto.coverLetter || null,
        cvUrl: dto.cvUrl || null,
        transcriptUrl: dto.transcriptUrl || null,
        status: 'pending',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            programme: true,
            semester: true,
            avatarUrl: true,
            university: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        opportunity: {
          select: {
            id: true,
            title: true,
            researchArea: true,
          },
        },
      },
    });
  }

  async getApplications(userId: string, opportunityId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // If user is a teacher, show applications for their opportunities
    if (user.profileMode === 'teacher') {
      const where: any = {
        opportunity: {
          teacherId: userId,
        },
      };

      if (opportunityId) {
        where.opportunityId = opportunityId;
      }

      return (this.prisma as any).researchApplication.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              programme: true,
              semester: true,
              avatarUrl: true,
              university: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          opportunity: {
            select: {
              id: true,
              title: true,
              researchArea: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // If user is a student, show their own applications
    const where: any = {
      studentId: userId,
    };

    if (opportunityId) {
      where.opportunityId = opportunityId;
    }

    return (this.prisma as any).researchApplication.findMany({
      where,
      include: {
        opportunity: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                university: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            university: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptApplication(applicationId: string, userId: string) {
    const application = await (this.prisma as any).researchApplication.findUnique({
      where: { id: applicationId },
      include: {
        opportunity: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.opportunity.teacherId !== userId) {
      throw new ForbiddenException('Only the teacher can accept applications');
    }

    // Update application status
    await (this.prisma as any).researchApplication.update({
      where: { id: applicationId },
      data: {
        status: 'accepted',
        reviewedAt: new Date(),
      },
    });

    // Check if opportunity should be marked as filled
    if (application.opportunity.maxApplicants) {
      const acceptedCount = await (this.prisma as any).researchApplication.count({
        where: {
          opportunityId: application.opportunityId,
          status: 'accepted',
        },
      });

      if (acceptedCount >= application.opportunity.maxApplicants) {
        await (this.prisma as any).researchOpportunity.update({
          where: { id: application.opportunityId },
          data: { status: 'filled' },
        });
      }
    }

    return { message: 'Application accepted successfully' };
  }

  async rejectApplication(applicationId: string, userId: string) {
    const application = await (this.prisma as any).researchApplication.findUnique({
      where: { id: applicationId },
      include: {
        opportunity: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.opportunity.teacherId !== userId) {
      throw new ForbiddenException('Only the teacher can reject applications');
    }

    await (this.prisma as any).researchApplication.update({
      where: { id: applicationId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
      },
    });

    return { message: 'Application rejected' };
  }
}

