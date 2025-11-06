import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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
            university: { select: { name: true } },
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

    // Update user
    await this.prisma.user.update({
      where: { id: approval.userId },
      data: {
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
      settings = await this.prisma.settings.create({
        data: {
          id: 'platform',
          enableCrossUniversityMatching: false,
          enableMarketplace: true,
          enableCareerFeatures: true,
          reportNotificationEmail: null,
        },
      });
    }

    return settings;
  }

  async updateSettings(adminId: string, settingsData: any) {
    await this.checkAdmin(adminId);

    const settings = await this.prisma.settings.upsert({
      where: { id: 'platform' },
      update: {
        enableCrossUniversityMatching: settingsData.enableCrossUniversityMatching ?? false,
        enableMarketplace: settingsData.enableMarketplace ?? true,
        enableCareerFeatures: settingsData.enableCareerFeatures ?? true,
        reportNotificationEmail: settingsData.reportNotificationEmail || null,
      },
      create: {
        id: 'platform',
        enableCrossUniversityMatching: settingsData.enableCrossUniversityMatching ?? false,
        enableMarketplace: settingsData.enableMarketplace ?? true,
        enableCareerFeatures: settingsData.enableCareerFeatures ?? true,
        reportNotificationEmail: settingsData.reportNotificationEmail || null,
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
}

