import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private async checkAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isBlocked: true },
    });

    if (!user || user.isBlocked) {
      throw new ForbiddenException('User not found or blocked');
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }

  async getAlumniRequests(adminId: string) {
    await this.checkAdmin(adminId);
    
    return this.prisma.alumniApproval.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            university: { 
              select: { 
                name: true,
                country: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              } 
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveAlumni(approvalId: string, adminId: string) {
    await this.checkAdmin(adminId);

    const approval = await this.prisma.alumniApproval.findUnique({
      where: { id: approvalId },
      include: { user: true },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    // Update approval
    await this.prisma.alumniApproval.update({
      where: { id: approvalId },
      data: {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Update user - set profileMode to alumni when approved
    await this.prisma.user.update({
      where: { id: approval.userId },
      data: {
        profileMode: 'alumni',
        isVerified: true,
        verificationStatus: 'approved',
      },
    });

    // Send notification
    if (approval.user.email) {
      await this.mailService.sendAlumniApprovalNotification(approval.user.email, true);
    }

    // Log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'alumni_approved',
        entityType: 'user',
        entityId: approval.userId,
      },
    });

    return { message: 'Alumni request approved' };
  }

  async rejectAlumni(approvalId: string, adminId: string) {
    await this.checkAdmin(adminId);

    const approval = await this.prisma.alumniApproval.findUnique({
      where: { id: approvalId },
      include: { user: true },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    await this.prisma.alumniApproval.update({
      where: { id: approvalId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: approval.userId },
      data: {
        verificationStatus: 'rejected',
      },
    });

    if (approval.user.email) {
      await this.mailService.sendAlumniApprovalNotification(approval.user.email, false);
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'alumni_rejected',
        entityType: 'user',
        entityId: approval.userId,
      },
    });

    return { message: 'Alumni request rejected' };
  }

  async getTeacherRequests(adminId: string) {
    await this.checkAdmin(adminId);
    
    return (this.prisma as any).teacherApproval.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            university: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveTeacher(approvalId: string, adminId: string) {
    await this.checkAdmin(adminId);

    const approval = await (this.prisma as any).teacherApproval.findUnique({
      where: { id: approvalId },
      include: { user: true },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    // Update approval
    await (this.prisma as any).teacherApproval.update({
      where: { id: approvalId },
      data: {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Update user - set profileMode to teacher when approved
    await this.prisma.user.update({
      where: { id: approval.userId },
      data: {
        profileMode: 'teacher',
        isVerified: true,
        verificationStatus: 'approved',
      },
    });

    // Send notification (if mail service has teacher notification method)
    // For now, we'll use alumni notification method
    if (approval.user.email) {
      try {
        await this.mailService.sendAlumniApprovalNotification(approval.user.email, true);
      } catch (error) {
        console.error('Failed to send teacher approval notification:', error);
      }
    }

    // Log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'teacher_approved',
        entityType: 'user',
        entityId: approval.userId,
      },
    });

    return { message: 'Teacher request approved' };
  }

  async rejectTeacher(approvalId: string, adminId: string) {
    await this.checkAdmin(adminId);

    const approval = await (this.prisma as any).teacherApproval.findUnique({
      where: { id: approvalId },
      include: { user: true },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    await (this.prisma as any).teacherApproval.update({
      where: { id: approvalId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: approval.userId },
      data: {
        verificationStatus: 'rejected',
      },
    });

    if (approval.user.email) {
      try {
        await this.mailService.sendAlumniApprovalNotification(approval.user.email, false);
      } catch (error) {
        console.error('Failed to send teacher rejection notification:', error);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'teacher_rejected',
        entityType: 'user',
        entityId: approval.userId,
      },
    });

    return { message: 'Teacher request rejected' };
  }

  async getReports(adminId: string) {
    await this.checkAdmin(adminId);

    return this.prisma.report.findMany({
      where: { status: 'pending' },
      include: {
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReport(reportId: string, adminId: string) {
    await this.checkAdmin(adminId);

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'resolved',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'report_resolved',
        entityType: 'report',
        entityId: reportId,
      },
    });

    return { message: 'Report resolved' };
  }

  async blockUser(userId: string, adminId: string) {
    await this.checkAdmin(adminId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'user_blocked',
        entityType: 'user',
        entityId: userId,
      },
    });

    return { message: 'User blocked' };
  }

  async hidePost(postId: string, adminId: string) {
    await this.checkAdmin(adminId);

    await this.prisma.post.update({
      where: { id: postId },
      data: { isHidden: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'post_hidden',
        entityType: 'post',
        entityId: postId,
      },
    });

    return { message: 'Post hidden' };
  }

  async deactivateListing(listingId: string, adminId: string) {
    await this.checkAdmin(adminId);

    await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'listing_deactivated',
        entityType: 'marketplace',
        entityId: listingId,
      },
    });

    return { message: 'Listing deactivated' };
  }

  async getMetrics(adminId: string) {
    await this.checkAdmin(adminId);

    const [
      totalUsers,
      verifiedUsers,
      pendingAlumni,
      totalMatches,
      totalPosts,
      totalJobs,
      totalListings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { verificationStatus: 'approved' } }),
      this.prisma.alumniApproval.count({ where: { status: 'pending' } }),
      this.prisma.match.count(),
      this.prisma.post.count(),
      this.prisma.job.count({ where: { isActive: true } }),
      this.prisma.marketplaceListing.count({ where: { isActive: true } }),
    ]);

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        pendingAlumni,
      },
      matches: totalMatches,
      posts: totalPosts,
      jobs: totalJobs,
      marketplace: totalListings,
    };
  }

  async getUsers(adminId: string, page: number = 1, limit: number = 50) {
    await this.checkAdmin(adminId);

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          university: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSettings(adminId: string) {
    await this.checkAdmin(adminId);

    let settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
    });

    if (!settings) {
      // Default profile-wise features
      const defaultStudentFeatures = {
        marketplace: true,
        career: true,
        crush: true,
        circles: true,
        feed: true,
        research: true,
      };
      const defaultAlumniFeatures = {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: true,
      };
      const defaultTeacherFeatures = {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: true,
      };

      settings = await this.prisma.settings.create({
        data: {
          id: 'platform',
          enableCrossUniversityMatching: false,
          enableMarketplace: true,
          enableCareerFeatures: true,
          reportNotificationEmail: null,
          enableStudentRegistration: true,
          enableAlumniRegistration: true,
          enableTeacherRegistration: true,
          studentFeatures: defaultStudentFeatures as any,
          alumniFeatures: defaultAlumniFeatures as any,
          teacherFeatures: defaultTeacherFeatures as any,
        },
      });
    }

    // Ensure profile features exist with defaults
    if (!settings.studentFeatures) {
      settings.studentFeatures = {
        marketplace: true,
        career: true,
        crush: true,
        circles: true,
        feed: true,
        research: true,
      };
    }
    if (!settings.alumniFeatures) {
      settings.alumniFeatures = {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: true,
      };
    }
    if (!settings.teacherFeatures) {
      settings.teacherFeatures = {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: true,
      };
    }

    return settings;
  }

  async updateSettings(adminId: string, settingsData: any) {
    await this.checkAdmin(adminId);

    console.log('[ADMIN SERVICE] Received settings data:', JSON.stringify(settingsData, null, 2));
    console.log('[ADMIN SERVICE] enableTeacherRegistration:', settingsData.enableTeacherRegistration, 'type:', typeof settingsData.enableTeacherRegistration);

    const settings = await this.prisma.settings.upsert({
      where: { id: 'platform' },
      update: {
        enableCrossUniversityMatching: settingsData.enableCrossUniversityMatching ?? false,
        enableMarketplace: settingsData.enableMarketplace ?? true,
        enableCareerFeatures: settingsData.enableCareerFeatures ?? true,
        reportNotificationEmail: settingsData.reportNotificationEmail || null,
        enableStudentRegistration: settingsData.enableStudentRegistration !== undefined ? settingsData.enableStudentRegistration : true,
        enableAlumniRegistration: settingsData.enableAlumniRegistration !== undefined ? settingsData.enableAlumniRegistration : true,
        enableTeacherRegistration: settingsData.enableTeacherRegistration !== undefined ? settingsData.enableTeacherRegistration : true,
        studentFeatures: settingsData.studentFeatures || null,
        alumniFeatures: settingsData.alumniFeatures || null,
        teacherFeatures: settingsData.teacherFeatures || null,
      } as any,
      create: {
        id: 'platform',
        enableCrossUniversityMatching: settingsData.enableCrossUniversityMatching ?? false,
        enableMarketplace: settingsData.enableMarketplace ?? true,
        enableCareerFeatures: settingsData.enableCareerFeatures ?? true,
        reportNotificationEmail: settingsData.reportNotificationEmail || null,
        enableStudentRegistration: settingsData.enableStudentRegistration !== undefined ? settingsData.enableStudentRegistration : true,
        enableAlumniRegistration: settingsData.enableAlumniRegistration !== undefined ? settingsData.enableAlumniRegistration : true,
        enableTeacherRegistration: settingsData.enableTeacherRegistration !== undefined ? settingsData.enableTeacherRegistration : true,
        studentFeatures: settingsData.studentFeatures || {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
          research: true,
        },
        alumniFeatures: settingsData.alumniFeatures || {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
          research: true,
        },
        teacherFeatures: settingsData.teacherFeatures || {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
          research: true,
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'settings_updated',
        entityType: 'settings',
        entityId: 'platform',
      },
    });

    return settings;
  }

  async getProfileFeatures(profileMode: string) {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
    });

    if (!settings) {
      // Return defaults if settings don't exist
      if (profileMode === 'student') {
        return {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
        };
      } else if (profileMode === 'alumni') {
        return {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
        };
      } else if (profileMode === 'teacher') {
        return {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
          research: true,
        };
      }
      return {};
    }

    // Return features for the specific profile mode
    if (profileMode === 'student') {
      return (settings.studentFeatures as any) || {
        marketplace: true,
        career: true,
        crush: true,
        circles: true,
        feed: true,
      };
    } else if (profileMode === 'alumni') {
      return (settings.alumniFeatures as any) || {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
      };
    } else if (profileMode === 'teacher') {
      return (settings.teacherFeatures as any) || {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: true,
      };
    }

    return {};
  }

  async getAuditLogs(adminId: string, page: number = 1, limit: number = 50) {
    await this.checkAdmin(adminId);

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    // Get actor information
    const actorIds = [...new Set(logs.map((log) => log.actorId))];
    const actors = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true },
    });

    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    return {
      logs: logs.map((log) => {
        const actor = actorMap.get(log.actorId);
        return {
          id: log.id,
          actor: actor?.name || actor?.email || 'System',
          action: log.action,
          entity: log.entityType,
          entityId: log.entityId,
          createdAt: log.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createUniversity(adminId: string, data: any) {
    await this.checkAdmin(adminId);

    if (!data.name || !data.domain || !data.countryId) {
      throw new BadRequestException('Name, domain, and country are required');
    }

    // Validate country exists and is active
    const country = await this.prisma.country.findUnique({
      where: { id: data.countryId },
    });

    if (!country) {
      throw new BadRequestException('Country not found');
    }

    if (!country.active) {
      throw new BadRequestException('Country is not active. Please activate the country first.');
    }

    // Check if domain already exists
    const existing = await this.prisma.university.findUnique({
      where: { domain: data.domain },
    });

    if (existing) {
      throw new ForbiddenException('A university with this domain already exists');
    }

    const university = await this.prisma.university.create({
      data: {
        name: data.name,
        domain: data.domain,
        countryId: data.countryId,
        active: data.active !== undefined ? data.active : true,
        allowCrossCampus: data.allowCrossCampus !== undefined ? data.allowCrossCampus : false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'university_created',
        entityType: 'university',
        entityId: university.id,
      },
    });

    return university;
  }

  async updateUniversity(adminId: string, id: string, data: any) {
    await this.checkAdmin(adminId);

    const university = await this.prisma.university.findUnique({
      where: { id },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    // Check if domain is being changed and if new domain already exists
    if (data.domain && data.domain !== university.domain) {
      const existing = await this.prisma.university.findUnique({
        where: { domain: data.domain },
      });

      if (existing) {
        throw new ForbiddenException('A university with this domain already exists');
      }
    }

    // Validate country if countryId is being updated
    if (data.countryId) {
      const country = await this.prisma.country.findUnique({
        where: { id: data.countryId },
      });

      if (!country) {
        throw new BadRequestException('Country not found');
      }

      if (!country.active) {
        throw new BadRequestException('Country is not active. Please activate the country first.');
      }
    }

    const updated = await this.prisma.university.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.domain && { domain: data.domain }),
        ...(data.countryId && { countryId: data.countryId }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.allowCrossCampus !== undefined && { allowCrossCampus: data.allowCrossCampus }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'university_updated',
        entityType: 'university',
        entityId: id,
      },
    });

    return updated;
  }

  async deleteUniversity(adminId: string, id: string) {
    await this.checkAdmin(adminId);

    const university = await this.prisma.university.findUnique({
      where: { id },
      include: { users: { take: 1 } },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    if (university.users.length > 0) {
      throw new ForbiddenException('Cannot delete university with existing users. Deactivate it instead.');
    }

    await this.prisma.university.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'university_deleted',
        entityType: 'university',
        entityId: id,
      },
    });

    return { message: 'University deleted successfully' };
  }

  async getUniversityRequests(adminId: string, status?: string) {
    await this.checkAdmin(adminId);

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const requests = await this.prisma.universityRequest.findMany({
      where,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to include country name for backward compatibility
    return requests.map((request) => ({
      id: request.id,
      universityName: request.universityName,
      country: request.country?.name || 'Not assigned',
      countryId: request.countryId,
      studentEmail: request.studentEmail,
      domain: request.domain,
      status: request.status,
      requestedBy: request.requestedBy,
      reviewedBy: request.reviewedBy,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }));
  }

  async approveUniversityRequest(adminId: string, requestId: string) {
    await this.checkAdmin(adminId);

    const request = await this.prisma.universityRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('University request not found');
    }

    if (request.status !== 'pending') {
      throw new ForbiddenException('This request has already been processed');
    }

    // Check if university already exists
    const existing = await this.prisma.university.findFirst({
      where: { domain: request.domain },
    });

    if (existing) {
      // Update request status
      await this.prisma.universityRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });
      throw new ForbiddenException('A university with this domain already exists');
    }

    // Validate that country exists and is active
    if (!request.countryId) {
      throw new BadRequestException('University request does not have a country assigned. Please assign a country first.');
    }

    const country = await this.prisma.country.findUnique({
      where: { id: request.countryId },
    });

    if (!country) {
      throw new BadRequestException('Country not found for this request');
    }

    if (!country.active) {
      throw new BadRequestException('Country is not active. Please activate the country first before approving this request.');
    }

    // Create the university automatically when approving the request
    const university = await this.prisma.university.create({
      data: {
        name: request.universityName,
        domain: request.domain,
        countryId: request.countryId,
        active: true,
        allowCrossCampus: false,
      },
    });

    // Update request status to approved
    await this.prisma.universityRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Send email notification to the user who requested
    if (request.studentEmail) {
      try {
        await this.mailService.sendUniversityRequestNotification(
          request.studentEmail,
          request.universityName,
          true, // approved
        );
      } catch (error) {
        console.error('Failed to send approval email:', error);
        // Don't fail the approval if email fails
      }
    }

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'university_request_approved',
        entityType: 'university_request',
        entityId: requestId,
        metadata: {
          requestId: request.id,
          universityId: university.id,
          universityName: request.universityName,
          domain: request.domain,
          countryId: request.countryId,
        },
      },
    });

    return {
      message: 'University request approved and university created successfully. The requester has been notified via email.',
      requestId: request.id,
      universityId: university.id,
    };
  }

  async rejectUniversityRequest(adminId: string, requestId: string) {
    await this.checkAdmin(adminId);

    const request = await this.prisma.universityRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('University request not found');
    }

    if (request.status !== 'pending') {
      throw new ForbiddenException('This request has already been processed');
    }

    await this.prisma.universityRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Send email notification to the user who requested
    if (request.studentEmail) {
      try {
        await this.mailService.sendUniversityRequestNotification(
          request.studentEmail,
          request.universityName,
          false, // rejected
        );
      } catch (error) {
        console.error('Failed to send rejection email:', error);
        // Don't fail the rejection if email fails
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'university_request_rejected',
        entityType: 'university_request',
        entityId: requestId,
      },
    });

    return { message: 'University request rejected' };
  }

  async cleanupStuckUsers(adminId: string) {
    await this.checkAdmin(adminId);

    // Find users who:
    // 1. Are not verified (isVerified = false)
    // 2. Have no consumed email verifications
    // 3. Were created more than 24 hours ago
    // 4. Have no other activity (no posts, no groups, etc.)
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const stuckUsers = await this.prisma.user.findMany({
      where: {
        isVerified: false,
        createdAt: { lt: cutoffDate },
        emailVerifications: {
          none: {
            consumed: true,
          },
        },
        posts: { none: {} },
        groupsCreated: { none: {} },
        marketplaceListings: { none: {} },
        jobApplications: { none: {} },
      },
      include: {
        emailVerifications: true,
      },
    });

    const deletedCount = stuckUsers.length;

    // Delete stuck users and their related data
    for (const user of stuckUsers) {
      // Delete email verifications
      await this.prisma.emailVerification.deleteMany({
        where: { userId: user.id },
      });

      // Delete alumni approvals if any
      await this.prisma.alumniApproval.deleteMany({
        where: { userId: user.id },
      });

      // Delete the user
      await this.prisma.user.delete({
        where: { id: user.id },
      });
    }

    // Log the cleanup
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'cleanup_stuck_users',
        entityType: 'user',
        entityId: 'bulk',
        metadata: { deletedCount },
      },
    });

    return {
      message: `Cleaned up ${deletedCount} stuck user(s)`,
      deletedCount,
    };
  }
}

