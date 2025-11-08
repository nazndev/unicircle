import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateProfileModeDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        university: {
          include: {
            country: true,
          },
        },
      },
    }) as any;

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user's country is active
    if (user.university?.country && !user.university.country.active) {
      throw new ForbiddenException({
        message: 'Your country has been deactivated. Please contact support for assistance.',
        code: 'COUNTRY_INACTIVE',
        country: user.university.country.name,
      });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Prepare update data
    const updateData: any = {
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
    };

    // If user is a teacher and wants to change university, allow it
    // (Note: universityId is not in UpdateProfileDto, but we handle it here for teachers)
    // Teachers can change university through profile update
    if (user.profileMode === 'teacher' && (dto as any).universityId) {
      updateData.universityId = (dto as any).universityId;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        university: true,
      },
    });
  }

  async updateProfileMode(userId: string, dto: UpdateProfileModeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Prevent going back to student if user is already alumni or teacher
    if (dto.profileMode === 'student' && (user.profileMode === 'alumni' || user.profileMode === 'teacher')) {
      throw new BadRequestException('Cannot switch back to student mode. Once you graduate or become a teacher, you cannot revert to student status.');
    }

    // Handle switching to alumni
    if (dto.profileMode === 'alumni') {
      // If user was registered via alumni_manual, require approval
      if (user.registrationSource === 'alumni_manual') {
        const existingApproval = await this.prisma.alumniApproval.findFirst({
          where: {
            userId,
            status: 'pending',
          },
        });

        if (!existingApproval && dto.documents && dto.documents.length > 0) {
          await this.prisma.alumniApproval.create({
            data: {
              userId,
              documents: dto.documents,
              status: 'pending',
            },
          });

          // Keep user in student mode until verified
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              // DO NOT change profileMode yet - keep as student
              verificationStatus: 'pending',
              documents: dto.documents,
            },
          });
        } else if (existingApproval) {
          // Approval already exists, don't change anything
          throw new BadRequestException('You already have a pending alumni verification request. Please wait for admin approval.');
        } else {
          throw new BadRequestException('Documents are required to switch to alumni mode. Please provide verification documents.');
        }
      } else {
        // Student email users switching to alumni - require verification
        // Keep user in student mode until verified
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            // DO NOT change profileMode yet - keep as student
            verificationStatus: 'pending',
          },
        });
        
        // Create alumni approval request
        await this.prisma.alumniApproval.create({
          data: {
            userId,
            status: 'pending',
          },
        });
      }
    }
    // Handle switching to teacher
    else if (dto.profileMode === 'teacher') {
      // Check if user has university email domain (trusted)
      const emailDomain = user.email.split('@')[1];
      const hasUniversityEmail = user.university?.domain === emailDomain;

      // Prepare update data
      const updateData: any = {};

      // Update university if provided
      if (dto.universityId) {
        updateData.universityId = dto.universityId;
      }

      // If user has university email domain, trust them immediately
      if (hasUniversityEmail && user.registrationSource === 'student_email') {
        // Trusted university email - immediate approval, can change mode
        updateData.profileMode = 'teacher';
        updateData.verificationStatus = 'approved';
        updateData.isVerified = true;
        
        await this.prisma.user.update({
          where: { id: userId },
          data: updateData,
        });
      } else {
        // Personal email or manual registration - require approval
        // Keep user in student mode until verified
        if (dto.documents && dto.documents.length > 0) {
          // Check for existing approval
          const existingApproval = await (this.prisma as any).teacherApproval.findFirst({
            where: {
              userId,
              status: 'pending',
            },
          });

          if (!existingApproval) {
            await (this.prisma as any).teacherApproval.create({
              data: {
                userId,
                documents: dto.documents,
                status: 'pending',
              },
            });
          } else {
            throw new BadRequestException('You already have a pending teacher verification request. Please wait for admin approval.');
          }

          // DO NOT change profileMode yet - keep as student
          updateData.verificationStatus = 'pending';
          updateData.documents = dto.documents;
        } else {
          throw new BadRequestException('Documents are required to switch to teacher mode. Please provide verification documents.');
        }

        await this.prisma.user.update({
          where: { id: userId },
          data: updateData,
        });
      }
    }
    // Handle other profile modes (shouldn't happen with new schema, but keep for safety)
    else {
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
        metadata: { 
          from: user.profileMode, 
          to: dto.profileMode,
          universityId: dto.universityId || user.universityId,
        },
      },
    });

    return this.getProfile(userId);
  }

  async completeOnboarding(userId: string) {
    await (this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
      } as any,
    }));

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

  async getProfileFeatures(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileMode: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const settings = await (this.prisma.settings.findUnique({
      where: { id: 'platform' },
    }) as Promise<any>);

    if (!settings) {
      // Return defaults
      if (user.profileMode === 'student') {
        return {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
        };
      } else if (user.profileMode === 'alumni') {
        return {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
        };
      }
      // Alumni can be professionals - no separate professional mode needed
      return {};
    }

    // Return features for the specific profile mode
    if (user.profileMode === 'student') {
      return (settings.studentFeatures as any) || {
        marketplace: true,
        career: true,
        crush: true,
        circles: true,
        feed: true,
        research: true,
      };
    } else if (user.profileMode === 'alumni') {
      return (settings.alumniFeatures as any) || {
        marketplace: true,
        career: true,
        circles: true,
        feed: true,
        research: true,
      };
    } else if (user.profileMode === 'teacher') {
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
}
