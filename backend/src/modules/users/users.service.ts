import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateProfileModeDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        university: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        department: dto.department,
        programme: dto.programme,
        semester: dto.semester,
        gender: dto.gender,
        avatarUrl: dto.avatarUrl,
        allowCrossCampus: dto.allowCrossCampus,
        currentStatus: dto.currentStatus,
        headline: dto.headline,
        experience: dto.experience,
        skills: dto.skills,
      },
      include: {
        university: true,
      },
    });
  }

  async updateProfileMode(userId: string, dto: UpdateProfileModeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // If switching to alumni and user was registered via alumni_manual, require approval
    if (dto.profileMode === 'alumni' && user.registrationSource === 'alumni_manual') {
      // Check if there's a pending approval
      const existingApproval = await this.prisma.alumniApproval.findFirst({
        where: {
          userId,
          status: 'pending',
        },
      });

      if (!existingApproval && dto.documents && dto.documents.length > 0) {
        // Create new approval request
        await this.prisma.alumniApproval.create({
          data: {
            userId,
            documents: dto.documents,
            status: 'pending',
          },
        });

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            profileMode: 'alumni',
            verificationStatus: 'pending',
            documents: dto.documents,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            profileMode: 'alumni',
          },
        });
      }
    } else {
      // For professional mode or student email users, no approval needed
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          profileMode: dto.profileMode,
        },
      });
    }

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'profile_mode_changed',
        entityType: 'user',
        entityId: userId,
        metadata: { from: user.profileMode, to: dto.profileMode },
      },
    });

    return this.getProfile(userId);
  }

  async deleteAccount(userId: string) {
    // Soft delete - anonymize data
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.local`,
        name: 'Deleted User',
        isBlocked: true,
      },
    });

    // Log deletion
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'account_deleted',
        entityType: 'user',
        entityId: userId,
      },
    });

    return { message: 'Account deleted successfully' };
  }
}
