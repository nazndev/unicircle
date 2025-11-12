import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private cacheService: CacheService,
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

  async getNameVerificationRequests(adminId: string) {
    await this.checkAdmin(adminId);
    
    return (this.prisma as any).nameVerification.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileMode: true,
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
            organization: {
              select: {
                name: true,
                country: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveNameVerification(verificationId: string, adminId: string) {
    await this.checkAdmin(adminId);

    const verification = await (this.prisma as any).nameVerification.findUnique({
      where: { id: verificationId },
      include: { user: true },
    });

    if (!verification) {
      throw new NotFoundException('Name verification request not found');
    }

    // Update verification
    await (this.prisma as any).nameVerification.update({
      where: { id: verificationId },
      data: {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Update user - set nameVerified = true
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: {
        nameVerified: true,
      } as any,
    });

    // Send notification
    if (verification.user.email) {
      await this.mailService.sendNameVerificationNotification(verification.user.email, true);
    }

    // Log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'name_verification_approved',
        entityType: 'nameVerification',
        entityId: verificationId,
        metadata: { userId: verification.userId } as any,
      },
    });

    return { message: 'Name verification approved successfully' };
  }

  async rejectNameVerification(verificationId: string, adminId: string, reason?: string) {
    await this.checkAdmin(adminId);

    const verification = await (this.prisma as any).nameVerification.findUnique({
      where: { id: verificationId },
      include: { user: true },
    });

    if (!verification) {
      throw new NotFoundException('Name verification request not found');
    }

    // Update verification
    await (this.prisma as any).nameVerification.update({
      where: { id: verificationId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Send notification
    if (verification.user.email) {
      await this.mailService.sendNameVerificationNotification(verification.user.email, false, reason);
    }

    // Log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'name_verification_rejected',
        entityType: 'nameVerification',
        entityId: verificationId,
        metadata: { userId: verification.userId, reason } as any,
      },
    });

    return { message: 'Name verification rejected successfully' };
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

    // Update user - set isAlumni = true and alumniVerified = true when approved (alumni verification badge)
    await this.prisma.user.update({
      where: { id: approval.userId },
      data: {
        isAlumni: true,
        alumniVerified: true, // Grant alumni verification badge after admin approval
        isVerified: true,
        verificationStatus: 'approved',
      } as any,
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

    // Update user - set isTeacher badge and teacherVerified when approved
    await this.prisma.user.update({
      where: { id: approval.userId },
      data: {
        isTeacher: true,
        teacherVerified: true,
        isVerified: true,
        verificationStatus: 'approved',
        // Also set alumni badge if not already set
        isAlumni: true,
        alumniVerified: true,
      } as any,
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
        // Note: research is NOT a student feature - it's badge-based (teacher badge) and platform-level
      };
      // Note: Alumni features are now part of professionalFeatures since all professionals are alumni
      const defaultProfessionalFeatures = {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: false, // Research is badge-based (teacher badge)
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
          enableProfessionalRegistration: true,
          studentFeatures: defaultStudentFeatures as any,
          professionalFeatures: defaultProfessionalFeatures as any,
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
        // Note: research is NOT a student feature - it's badge-based (teacher badge) and platform-level
      };
    }
    if (!settings.professionalFeatures) {
      // Professional features = Alumni features (since all professionals are alumni)
      settings.professionalFeatures = {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: false, // Research is badge-based
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
        enableProfessionalRegistration: settingsData.enableProfessionalRegistration !== undefined ? settingsData.enableProfessionalRegistration : true,
        studentFeatures: settingsData.studentFeatures || null,
        professionalFeatures: settingsData.professionalFeatures || null,
        badgeSpaces: settingsData.badgeSpaces || null,
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
        enableProfessionalRegistration: settingsData.enableProfessionalRegistration !== undefined ? settingsData.enableProfessionalRegistration : true,
        studentFeatures: settingsData.studentFeatures || {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
          research: false, // Research is badge-based
        },
        professionalFeatures: settingsData.professionalFeatures || {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
          research: false, // Research is badge-based (teacher badge space)
        },
        badgeSpaces: settingsData.badgeSpaces || null,
        minAgeStudent: settingsData.minAgeStudent !== undefined ? settingsData.minAgeStudent : null,
        maxAgeStudent: settingsData.maxAgeStudent !== undefined ? settingsData.maxAgeStudent : null,
        minAgeProfessional: settingsData.minAgeProfessional !== undefined ? settingsData.minAgeProfessional : null,
        maxAgeProfessional: settingsData.maxAgeProfessional !== undefined ? settingsData.maxAgeProfessional : null,
        termsMessage: settingsData.termsMessage || null,
        termsLink: settingsData.termsLink || null,
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

    // Invalidate cache and re-cache updated settings
    await this.cacheService.invalidateSettings();
    await this.cacheService.invalidateAllUserFeatures(); // Invalidate all user features since settings changed
    await this.cacheService.cacheSettings(settings);

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
      }
      return {};
    }

    // Return features for the specific profile mode
    // Teacher is now a badge, not a profileMode - removed
    if (profileMode === 'student') {
      return (settings.studentFeatures as any) || {
        marketplace: true,
        career: true,
        crush: true,
        circles: true,
        feed: true,
      };
    } else if (profileMode === 'professional') {
      return (settings.professionalFeatures as any) || {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
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

  async getUniversities(adminId: string, countryId?: string) {
    await this.checkAdmin(adminId);
    
    const where: any = {};
    if (countryId) {
      where.countryId = countryId;
    }
    
    const universities = await this.prisma.university.findMany({
      where,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            active: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return universities.map((u: any) => ({
      id: u.id,
      name: u.name,
      domain: u.domain,
      countryId: u.countryId,
      country: u.country,
      active: u.active,
      allowCrossCampus: u.allowCrossCampus,
      createdAt: u.createdAt,
    }));
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

  // Organization Management
  async getOrganizations(adminId: string, countryId?: string) {
    await this.checkAdmin(adminId);

    const where: any = {};
    if (countryId) {
      where.countryId = countryId;
    }

    return (this.prisma as any).organization.findMany({
      where,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createOrganization(adminId: string, data: any) {
    await this.checkAdmin(adminId);

    if (!data.name || !data.domain) {
      throw new BadRequestException('Name and domain are required');
    }

    // Validate country if provided
    if (data.countryId) {
      const country = await (this.prisma as any).country.findUnique({
        where: { id: data.countryId },
      });

      if (!country) {
        throw new BadRequestException('Country not found');
      }

      if (!country.active) {
        throw new BadRequestException('Country is not active. Please activate the country first.');
      }
    }

    // Check if domain already exists (in both universities and organizations)
    const existingUniversity = await this.prisma.university.findUnique({
      where: { domain: data.domain },
    });

    if (existingUniversity) {
      throw new ForbiddenException('A university with this domain already exists');
    }

    const existingOrg = await (this.prisma as any).organization.findUnique({
      where: { domain: data.domain },
    });

    if (existingOrg) {
      throw new ForbiddenException('An organization with this domain already exists');
    }

    const organization = await (this.prisma as any).organization.create({
      data: {
        name: data.name,
        domain: data.domain,
        countryId: data.countryId || null,
        active: data.active !== undefined ? data.active : true,
        type: data.type || null,
        website: data.website || null,
        description: data.description || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'organization_created',
        entityType: 'organization',
        entityId: organization.id,
      },
    });

    return organization;
  }

  async updateOrganization(adminId: string, id: string, data: any) {
    await this.checkAdmin(adminId);

    const organization = await (this.prisma as any).organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if domain is being changed and if new domain already exists
    if (data.domain && data.domain !== organization.domain) {
      const existingUniversity = await this.prisma.university.findUnique({
        where: { domain: data.domain },
      });

      if (existingUniversity) {
        throw new ForbiddenException('A university with this domain already exists');
      }

      const existingOrg = await (this.prisma as any).organization.findUnique({
        where: { domain: data.domain },
      });

      if (existingOrg) {
        throw new ForbiddenException('An organization with this domain already exists');
      }
    }

    // Validate country if countryId is being updated
    if (data.countryId) {
      const country = await (this.prisma as any).country.findUnique({
        where: { id: data.countryId },
      });

      if (!country) {
        throw new BadRequestException('Country not found');
      }

      if (!country.active) {
        throw new BadRequestException('Country is not active. Please activate the country first.');
      }
    }

    const updated = await (this.prisma as any).organization.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.domain && { domain: data.domain }),
        ...(data.countryId !== undefined && { countryId: data.countryId }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'organization_updated',
        entityType: 'organization',
        entityId: id,
      },
    });

    return updated;
  }

  async deleteOrganization(adminId: string, id: string) {
    await this.checkAdmin(adminId);

    const organization = await (this.prisma as any).organization.findUnique({
      where: { id },
      include: { users: { take: 1 } },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.users.length > 0) {
      throw new ForbiddenException('Cannot delete organization with existing users. Deactivate it instead.');
    }

    await (this.prisma as any).organization.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'organization_deleted',
        entityType: 'organization',
        entityId: id,
      },
    });

    return { message: 'Organization deleted successfully' };
  }

  async getInstitutionRequests(adminId: string, status?: string) {
    await this.checkAdmin(adminId);

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const requests = await (this.prisma as any).institutionRequest.findMany({
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

    // Map to include country name and backward compatibility
    return requests.map((request: any) => ({
      id: request.id,
      institutionName: request.institutionName,
      institutionType: request.institutionType, // "university" | "organization" | null
      universityName: request.institutionName, // Backward compatibility
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

  async approveInstitutionRequest(adminId: string, requestId: string, institutionType: 'university' | 'organization') {
    await this.checkAdmin(adminId);

    const request = await (this.prisma as any).institutionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Institution request not found');
    }

    if (request.status !== 'pending') {
      throw new ForbiddenException('This request has already been processed');
    }

    // Validate institution type
    if (!institutionType || !['university', 'organization'].includes(institutionType)) {
      throw new BadRequestException('Invalid institution type. Must be "university" or "organization"');
    }

    // Check if institution already exists
    const existingUniversity = await this.prisma.university.findFirst({
      where: { domain: request.domain },
    });

    const existingOrganization = await this.prisma.organization.findFirst({
      where: { domain: request.domain },
    });

    if (existingUniversity || existingOrganization) {
      // Update request status
      await (this.prisma as any).institutionRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });
      throw new ForbiddenException('An institution with this domain already exists');
    }

    // Validate that country exists and is active
    if (!request.countryId) {
      throw new BadRequestException('Institution request does not have a country assigned. Please assign a country first.');
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

    let createdInstitution: any;

    // Create the institution based on type
    if (institutionType === 'university') {
      createdInstitution = await this.prisma.university.create({
        data: {
          name: request.institutionName,
          domain: request.domain,
          countryId: request.countryId,
          active: true,
          allowCrossCampus: false,
        },
      });
    } else {
      // organization
      createdInstitution = await this.prisma.organization.create({
        data: {
          name: request.institutionName,
          domain: request.domain,
          countryId: request.countryId,
          active: true,
        },
      });
    }

    // Update request status to approved with institution type
    await (this.prisma as any).institutionRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        institutionType: institutionType,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Send email notification to the user who requested
    if (request.studentEmail) {
      try {
        await this.mailService.sendInstitutionRequestNotification(
          request.studentEmail,
          request.institutionName,
          institutionType,
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
        action: 'institution_request_approved',
        entityType: 'institution_request',
        entityId: requestId,
        metadata: {
          requestId: request.id,
          institutionId: createdInstitution.id,
          institutionName: request.institutionName,
          institutionType: institutionType,
          domain: request.domain,
          countryId: request.countryId,
        },
      },
    });

    return {
      message: `Institution request approved and ${institutionType} created successfully. The requester has been notified via email.`,
      requestId: request.id,
      institutionId: createdInstitution.id,
      institutionType: institutionType,
    };
  }

  async rejectInstitutionRequest(adminId: string, requestId: string) {
    await this.checkAdmin(adminId);

    const request = await (this.prisma as any).institutionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Institution request not found');
    }

    if (request.status !== 'pending') {
      throw new ForbiddenException('This request has already been processed');
    }

    // Update request status
    await (this.prisma as any).institutionRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Send email notification
    if (request.studentEmail) {
      try {
        await this.mailService.sendInstitutionRequestNotification(
          request.studentEmail,
          request.institutionName,
          null, // type not set for rejected
          false, // rejected
        );
      } catch (error) {
        console.error('Failed to send rejection email:', error);
      }
    }

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'institution_request_rejected',
        entityType: 'institution_request',
        entityId: requestId,
        metadata: {
          requestId: request.id,
          institutionName: request.institutionName,
          domain: request.domain,
        },
      },
    });

    return {
      message: 'Institution request rejected. The requester has been notified via email.',
      requestId: request.id,
    };
  }

  // Backward compatibility
  async rejectUniversityRequest(adminId: string, requestId: string) {
    return this.rejectInstitutionRequest(adminId, requestId);
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

  // Badge Management
  async getBadgeRequests(adminId: string, status?: 'pending' | 'verified' | 'all') {
    await this.checkAdmin(adminId);

    const where: any = {};
    if (status && status !== 'all') {
      where.verified = status === 'verified';
    }

    return (this.prisma as any).userBadge.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileMode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyBadge(adminId: string, badgeId: string) {
    await this.checkAdmin(adminId);

    const badge = await (this.prisma as any).userBadge.findUnique({
      where: { id: badgeId },
      include: { user: true },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    if (badge.verified) {
      throw new BadRequestException('Badge is already verified');
    }

    // Update badge to verified
    await (this.prisma as any).userBadge.update({
      where: { id: badgeId },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
      },
    });

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'badge_verified',
        entityType: 'user_badge',
        entityId: badgeId,
        metadata: {
          userId: badge.userId,
          badgeType: badge.badgeType,
        },
      },
    });

    // Invalidate user features cache since badge was verified
    await this.cacheService.invalidateUserFeatures(badge.userId);

    return { message: 'Badge verified successfully' };
  }

  async rejectBadge(adminId: string, badgeId: string, reason?: string) {
    await this.checkAdmin(adminId);

    const badge = await (this.prisma as any).userBadge.findUnique({
      where: { id: badgeId },
      include: { user: true },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    // Delete the badge (rejection means removing it)
    await (this.prisma as any).userBadge.delete({
      where: { id: badgeId },
    });

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'badge_rejected',
        entityType: 'user_badge',
        entityId: badgeId,
        metadata: {
          userId: badge.userId,
          badgeType: badge.badgeType,
          reason: reason || 'Not provided',
        },
      },
    });

    // Invalidate user features cache since badge was removed
    await this.cacheService.invalidateUserFeatures(badge.userId);

    return { message: 'Badge rejected and removed' };
  }

  async removeBadge(adminId: string, badgeId: string) {
    await this.checkAdmin(adminId);

    const badge = await (this.prisma as any).userBadge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    await (this.prisma as any).userBadge.delete({
      where: { id: badgeId },
    });

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'badge_removed',
        entityType: 'user_badge',
        entityId: badgeId,
        metadata: {
          userId: badge.userId,
          badgeType: badge.badgeType,
        },
      },
    });

    // Invalidate user features cache since badge was removed
    await this.cacheService.invalidateUserFeatures(badge.userId);

    return { message: 'Badge removed successfully' };
  }

  /**
   * Reload cache - invalidate and rebuild cache
   */
  async reloadCache(adminId: string) {
    await this.checkAdmin(adminId);

    // Get fresh settings from database
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
    });

    if (settings) {
      // Re-cache settings
      await this.cacheService.cacheSettings(settings);
    }

    // Invalidate all user features (they will be rebuilt on next request)
    await this.cacheService.invalidateAllUserFeatures();

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'cache_reloaded',
        entityType: 'cache',
        entityId: 'all',
      },
    });

    const stats = await this.cacheService.getCacheStats();

    return {
      message: 'Cache reloaded successfully',
      stats,
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(adminId: string) {
    await this.checkAdmin(adminId);
    return this.cacheService.getCacheStats();
  }
}

