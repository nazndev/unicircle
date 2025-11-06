import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async createJob(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Only professional users, verified alumni, or admins can post jobs
    if (!user || user.isBlocked) {
      throw new ForbiddenException('User not found or blocked');
    }

    if (user.profileMode !== 'professional' && user.verificationStatus !== 'approved') {
      throw new ForbiddenException('Only professional users or verified alumni can post jobs');
    }

    return this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        employmentType: dto.employmentType,
        location: dto.location,
        ownerUserId: userId,
        targetUniversityId: dto.targetUniversityId,
        targetProgramme: dto.targetProgramme,
      },
      include: {
        ownerUser: {
          select: {
            id: true,
            name: true,
            headline: true,
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

  async getJobs(userId: string, filters: any = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = { isActive: true };

    if (filters.programme) {
      where.targetProgramme = filters.programme;
    }

    if (filters.universityId) {
      where.targetUniversityId = filters.universityId;
    }

    return this.prisma.job.findMany({
      where,
      include: {
        ownerUser: {
          select: {
            id: true,
            name: true,
            headline: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async applyJob(jobId: string, applicantId: string, dto: any) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || !job.isActive) {
      throw new NotFoundException('Job not found or inactive');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: applicantId },
    });

    if (!user || user.verificationStatus !== 'approved') {
      throw new ForbiddenException('Only verified users can apply to jobs');
    }

    // Check if already applied
    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_applicantId: {
          jobId,
          applicantId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already applied to this job');
    }

    return this.prisma.jobApplication.create({
      data: {
        jobId,
        applicantId,
        coverLetter: dto.coverLetter,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { applicantId: userId },
      include: {
        job: {
          include: {
            ownerUser: {
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
}

