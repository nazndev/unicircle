import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateProfileModeDto } from './dto';
import { BadgeService } from '../badge/badge.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private badgeService: BadgeService,
    private cacheService: CacheService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        university: {
          include: {
            country: true,
          },
        },
        organization: {
          include: {
            country: true,
          },
        },
        badges: true, // Include user badges
      },
    } as any) as any;

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user's country is active (for both university and organization)
    const country = user.university?.country || user.organization?.country;
    if (country && !country.active) {
      throw new ForbiddenException({
        message: 'Your country has been deactivated. Please contact support for assistance.',
        code: 'COUNTRY_INACTIVE',
        country: country.name,
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

    // Validate age if dateOfBirth is provided
    if (dto.dateOfBirth) {
      const dob = new Date(dto.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      // Get age limits from cached settings
      const cachedSettings = await this.cacheService.getCachedSettings();
      let settings = cachedSettings;
      if (!settings) {
        settings = await (this.prisma.settings.findUnique({
          where: { id: 'platform' },
          select: {
            minAgeStudent: true,
            maxAgeStudent: true,
            minAgeProfessional: true,
            maxAgeProfessional: true,
          } as any,
        })) as any;
        if (settings) {
          await this.cacheService.cacheSettings(settings);
        }
      }

      const profileMode = user.profileMode || 'student';
      const minAge = profileMode === 'student' ? settings?.minAgeStudent : settings?.minAgeProfessional;
      const maxAge = profileMode === 'student' ? settings?.maxAgeStudent : settings?.maxAgeProfessional;

      if (minAge !== null && age < minAge) {
        throw new BadRequestException(
          `You must be at least ${minAge} years old to register as a ${profileMode}.`
        );
      }

      if (maxAge !== null && age > maxAge) {
        throw new BadRequestException(
          `You must be ${maxAge} years old or younger to register as a ${profileMode}.`
        );
      }
    }

    // Prevent name change if name is verified
    if (dto.name && user.nameVerified && dto.name !== user.name) {
      throw new BadRequestException('Name cannot be changed once verified. Please contact support if you need to update your verified name.');
    }

    // Handle name verification documents
    if (dto.nameVerificationDocuments && dto.nameVerificationDocuments.length > 0) {
      // Check if there's already a pending name verification request
      const existingVerification = await (this.prisma as any).nameVerification.findFirst({
        where: {
          userId,
          status: 'pending',
        },
      });

      if (!existingVerification) {
        // Create new name verification request
        await (this.prisma as any).nameVerification.create({
          data: {
            userId,
            documents: dto.nameVerificationDocuments as any,
            status: 'pending',
          },
        });
      } else {
        // Update existing pending request
        await (this.prisma as any).nameVerification.update({
          where: { id: existingVerification.id },
          data: {
            documents: dto.nameVerificationDocuments as any,
          },
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      name: dto.name && !user.nameVerified ? dto.name : undefined, // Only allow name update if not verified
      nameVerificationDocuments: dto.nameVerificationDocuments ? (dto.nameVerificationDocuments as any) : undefined,
      department: dto.department,
      programme: dto.programme,
      semester: dto.semester,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      phoneNumber: dto.phoneNumber,
      passingYear: dto.passingYear,
      graduationYear: dto.graduationYear,
      bio: dto.bio,
      interests: dto.interests,
      avatarUrl: dto.avatarUrl,
      allowCrossCampus: dto.allowCrossCampus,
      currentStatus: dto.currentStatus,
      headline: dto.headline,
      experience: dto.experience,
      skills: dto.skills,
      researchInterests: dto.researchInterests,
    };

    // Remove undefined values to avoid overwriting with null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Handle profile mode changes
    if (dto.profileMode) {
      updateData.profileMode = dto.profileMode;
      
      // If student changes to professional, automatically grant verified alumni badge
      if (dto.profileMode === 'professional' && user.profileMode === 'student' && user.universityId) {
        updateData.isAlumni = true;
        updateData.alumniVerified = true; // Student → Professional: verified (was already verified with university email)
      }
    }

    // If user is a teacher and wants to change university, allow it
    // If user is a professional and wants to change organization, allow it
    if (user.profileMode === 'teacher' && dto.universityId) {
      updateData.universityId = dto.universityId;
    } else if (user.profileMode === 'professional' && dto.organizationId) {
      updateData.organizationId = dto.organizationId;
      // When professional changes organization, reset officeEmailVerified until new email is verified
      if (dto.organizationId !== user.organizationId) {
        updateData.officeEmailVerified = false;
      }
    }

    // Handle professional onboarding: if professional selects university, grant alumni badge (unverified)
    if (dto.profileMode === 'professional' && dto.universityId) {
      updateData.universityId = dto.universityId;
      updateData.organizationId = null; // Clear organization if selecting university
      updateData.isAlumni = true; // Professional with university = alumni
      updateData.alumniVerified = false; // Unverified by default, needs document verification
      
      // If documents provided, create alumni approval request
      if (dto.documents && dto.documents.length > 0) {
        const existingApproval = await this.prisma.alumniApproval.findFirst({
          where: {
            userId,
            status: 'pending',
          },
        });

        if (!existingApproval) {
          await this.prisma.alumniApproval.create({
            data: {
              userId,
              documents: dto.documents as any,
              status: 'pending',
            },
          });
        }
      }
    } else if (dto.profileMode === 'professional' && dto.organizationId) {
      updateData.organizationId = dto.organizationId;
      // Don't clear universityId - preserve original university affiliation
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        university: true,
        organization: true,
      },
    } as any);
  }

  async updateProfileMode(userId: string, dto: UpdateProfileModeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Prevent going back to student if user is already professional
    if (dto.profileMode === 'student' && user.profileMode === 'professional') {
      throw new BadRequestException('Cannot switch back to student mode. Once you become a professional, you cannot revert to student status.');
    }

    // Handle profileMode changes (student ↔ professional)
    // Teacher is now a badge, not a profileMode
    const updateData: any = {};

    if (dto.profileMode === 'professional') {
      // This will be handled in the professional section below
    } else if (dto.profileMode === 'student') {
      // Only allow if currently professional (but keep teacher badge if they have it)
      if (user.profileMode === 'professional') {
        updateData.profileMode = 'student';
        // Keep isTeacher badge if they have it (a student can also be a teacher)
      }
    }
    // Handle switching to professional
    else if (dto.profileMode === 'professional') {
      // Professionals MUST register with organization email - no manual registration
      const emailDomain = user.email.split('@')[1];
      const hasOrganizationEmail = (user as any).organization?.domain === emailDomain;

      if (!hasOrganizationEmail && !dto.officeEmail && !dto.organizationId) {
        throw new BadRequestException('Professionals must register with an organization email address. Please use your office email to register as a professional.');
      }

      // If office email is provided, verify the organization domain
      let organizationId = (user as any).organizationId;
      if (dto.officeEmail) {
        const orgDomain = dto.officeEmail.split('@')[1];
        if (!orgDomain) {
          throw new BadRequestException('Invalid office email format');
        }

        const organization = await (this.prisma as any).organization.findFirst({
          where: {
            domain: orgDomain,
            active: true,
            country: {
              active: true,
            },
          },
        });

        if (!organization) {
          throw new BadRequestException('Organization domain not found or not whitelisted. Please contact support to add your organization.');
        }

        organizationId = organization.id;
      } else if (dto.organizationId) {
        organizationId = dto.organizationId;
      }

      const updateData: any = {
        profileMode: 'professional',
        organizationId: organizationId,
        verificationStatus: 'approved',
        isVerified: true,
        officeEmailVerified: true,
        // DO NOT clear universityId - preserve original university affiliation
      };

      // If user was a student, automatically become alumni with verified badge (they were already verified with university email)
      if (user.profileMode === 'student' && user.universityId) {
        updateData.isAlumni = true;
        updateData.alumniVerified = true; // Student → Professional: alumni badge verified (was already verified with university email)
      }

      // If directly registering as professional (not from student), need university info + documents
      if (user.profileMode !== 'student') {
        if (!user.universityId && !dto.universityId) {
          throw new BadRequestException('University information is required when registering as a professional. Please provide your university details.');
        }

        // If no student history, need documents for alumni verification
        if (!(user as any).isAlumni && (!dto.documents || dto.documents.length === 0)) {
          throw new BadRequestException('Documents are required to verify your alumni status. Please provide graduation certificate or transcript.');
        }

        if (dto.universityId) {
          updateData.universityId = dto.universityId;
        }

        // Direct registration as professional: set isAlumni = true (they provided university info), but alumniVerified = false until admin approves
        updateData.isAlumni = true;
        updateData.alumniVerified = false; // Will be set to true after admin approval

        // Create alumni approval request if documents provided
        if (dto.documents && dto.documents.length > 0) {
          const existingApproval = await this.prisma.alumniApproval.findFirst({
            where: {
              userId,
              status: 'pending',
            },
          });

          if (!existingApproval) {
            await this.prisma.alumniApproval.create({
              data: {
                userId,
                documents: dto.documents,
                status: 'pending',
              },
            });
          } else {
            throw new BadRequestException('You already have a pending alumni verification request. Please wait for admin approval.');
          }
        }
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      } as any);
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
    // Delete all devices associated with this user (Device model has onDelete: Cascade, but explicit deletion is safer)
    await (this.prisma as any).device.deleteMany({
      where: { userId },
    });

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
    // Try to get from cache first
    const cachedFeatures = await this.cacheService.getCachedUserFeatures(userId);
    if (cachedFeatures) {
      return cachedFeatures;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileMode: true },
    }) as any;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check isTeacher from full user object (for backward compatibility)
    const userWithTeacher = await this.prisma.user.findUnique({
      where: { id: userId },
    }) as any;
    const isTeacher = userWithTeacher?.isTeacher || false;

    // Try to get settings from cache first
    let settings = await this.cacheService.getCachedSettings();
    if (!settings) {
      settings = await (this.prisma.settings.findUnique({
        where: { id: 'platform' },
      }) as Promise<any>);
      // Cache settings for future use
      if (settings) {
        await this.cacheService.cacheSettings(settings);
      }
    }

    // Return features for the specific profile mode
    // Research feature is enabled if isTeacher=true (badge-based)
    let baseFeatures: any = {};

    if (!settings) {
      // Return defaults based on profileMode only
      if (user.profileMode === 'student') {
        baseFeatures = {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
          // Note: research is NOT a student feature - it's badge-based (teacher badge) and platform-level
        };
      } else if (user.profileMode === 'professional') {
        baseFeatures = {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
          // Note: research is NOT a professional feature - it's badge-based (teacher badge) and platform-level
        };
      }
    } else {
      // Use settings-based features
      if (user.profileMode === 'student') {
        baseFeatures = (settings.studentFeatures as any) || {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
          // Note: research is NOT a student feature - it's badge-based (teacher badge) and platform-level
        };
      } else if (user.profileMode === 'professional') {
        baseFeatures = (settings.professionalFeatures as any) || {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
          // Note: research is NOT a professional feature - it's badge-based (teacher badge) and platform-level
        };
      }
    }

    // Get available spaces based on verified badges
    // Badges enable "Spaces" (specialized communities), not individual features
    const verifiedBadges = await this.badgeService.getVerifiedBadges(userId);
    const badgeSpaces = (settings?.badgeSpaces as any) || {};
    const availableSpaces: any[] = [];

    // Collect enabled spaces for user's verified badges
    // Filter by accessType to ensure user's profile mode can access the space
    for (const badge of verifiedBadges) {
      const badgeSpace = badgeSpaces[badge.badgeType];
      if (badgeSpace && badgeSpace.enabled === true) {
        const accessType = badgeSpace.accessType || 'both'; // Default to 'both' if not specified
        const userProfileMode = user.profileMode || 'student';
        
        // Check if user's profile mode can access this space
        const canAccess = 
          accessType === 'both' ||
          (accessType === 'student' && userProfileMode === 'student') ||
          (accessType === 'professional' && userProfileMode === 'professional');
        
        if (canAccess) {
          availableSpaces.push({
            badgeType: badge.badgeType,
            name: badgeSpace.name || `${badge.badgeType} Space`,
            description: badgeSpace.description,
            accessType: accessType,
          });
        }
      }
    }

    // Add spaces to features object (for mobile app compatibility)
    if (availableSpaces.length > 0) {
      baseFeatures.spaces = availableSpaces;
    }

    // Research feature is enabled for users with verified teacher badge
    // This enables research publishing/managing capabilities
    // Students can browse/apply to research opportunities (controlled by platform-level enableResearchFeatures)
    // But only teachers can publish/manage research opportunities
    if (isTeacher) {
      baseFeatures.research = true; // Enables research publishing/managing
    } else {
      const hasTeacherBadge = await this.badgeService.hasBadge(userId, 'teacher', true);
      if (hasTeacherBadge) {
        baseFeatures.research = true; // Enables research publishing/managing
      }
    }
    // Note: Students can always browse/apply to research opportunities if platform-level enableResearchFeatures is true
    // They don't need research=true in their features - that's only for publishing/managing

    // Cache the computed features
    await this.cacheService.cacheUserFeatures(userId, baseFeatures);

    return baseFeatures;
  }

  /**
   * Toggle teacher badge (backward compatibility endpoint)
   * Now uses the generic badge system
   */
  async toggleTeacherBadge(userId: string, dto: { universityId?: string; documents?: string[] }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    }) as any;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has teacher badge
    const existingBadge = await (this.prisma as any).userBadge.findUnique({
      where: {
        userId_badgeType: {
          userId,
          badgeType: 'teacher',
        },
      },
    });

    const wantsTeacherBadge = !existingBadge;

    if (wantsTeacherBadge) {
      // Add teacher badge
      const documents = dto.documents || [];
      const metadata = dto.universityId ? { universityId: dto.universityId } : null;

      // Check if user has verified university email
      const emailDomain = user.email.split('@')[1];
      const hasUniversityEmail = user.university?.domain === emailDomain;

      if (hasUniversityEmail) {
        // Auto-verify if university email matches
        const badge = await this.badgeService.addBadge(userId, 'teacher', documents, metadata);
        // Auto-verify the badge
        await (this.prisma as any).userBadge.update({
          where: { id: badge.id },
          data: {
            verified: true,
            verifiedAt: new Date(),
          },
        });
      } else {
        // Add unverified badge (requires admin approval)
        await this.badgeService.addBadge(userId, 'teacher', documents, metadata);
      }

      // Also update legacy isTeacher field for backward compatibility
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isTeacher: true,
          teacherVerified: hasUniversityEmail,
        } as any,
      });
    } else {
      // Remove teacher badge
      if (existingBadge && !existingBadge.verified) {
        // Only allow removing unverified badges
        await this.badgeService.removeBadge(userId, existingBadge.id);
      } else if (existingBadge && existingBadge.verified) {
        throw new BadRequestException('Cannot remove verified badge. Please contact admin to remove it.');
      }

      // Also update legacy isTeacher field
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isTeacher: false,
          teacherVerified: false,
        } as any,
      });
    }

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: wantsTeacherBadge ? 'teacher_badge_added' : 'teacher_badge_removed',
        entityType: 'user',
        entityId: userId,
        metadata: { isTeacher: wantsTeacherBadge },
      },
    });

    return this.getProfile(userId);
  }
}



