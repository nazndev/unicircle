import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class BadgeService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get all badges for a user
   */
  async getUserBadges(userId: string) {
    return (this.prisma as any).userBadge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add a badge to user (unverified by default)
   */
  async addBadge(userId: string, badgeType: string, documents?: any[], metadata?: any) {
    // Validate badge type - get from available badge types
    const availableBadgeTypes = this.getAvailableBadgeTypes();
    const validBadgeTypes = availableBadgeTypes.map(bt => bt.type);

    if (!validBadgeTypes.includes(badgeType)) {
      throw new BadRequestException(`Invalid badge type: ${badgeType}. Valid types: ${validBadgeTypes.join(', ')}`);
    }

    // Check if user already has this badge
    const existing = await (this.prisma as any).userBadge.findUnique({
      where: {
        userId_badgeType: {
          userId,
          badgeType,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`User already has ${badgeType} badge`);
    }

    // Create badge (unverified by default)
    const badge = await (this.prisma as any).userBadge.create({
      data: {
        userId,
        badgeType,
        verified: false,
        documents: documents || null,
        metadata: metadata || null,
      },
    });

    // Invalidate user features cache (will be rebuilt on next request)
    await this.cacheService.invalidateUserFeatures(userId);

    return badge;
  }

  /**
   * Remove a badge from user
   */
  async removeBadge(userId: string, badgeId: string) {
    const badge = await (this.prisma as any).userBadge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    if (badge.userId !== userId) {
      throw new ForbiddenException('You can only remove your own badges');
    }

    // Don't allow removing verified badges without admin approval
    if (badge.verified) {
      throw new BadRequestException('Cannot remove verified badge. Please contact admin to remove it.');
    }

    const deleted = await (this.prisma as any).userBadge.delete({
      where: { id: badgeId },
    });

    // Invalidate user features cache
    await this.cacheService.invalidateUserFeatures(userId);

    return deleted;
  }

  /**
   * Update badge documents/metadata (user can update unverified badges)
   */
  async updateBadge(userId: string, badgeId: string, documents?: any[], metadata?: any) {
    const badge = await (this.prisma as any).userBadge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    if (badge.userId !== userId) {
      throw new ForbiddenException('You can only update your own badges');
    }

    // Users can only update unverified badges
    if (badge.verified) {
      throw new BadRequestException('Cannot update verified badge. Please contact admin.');
    }

    const updated = await (this.prisma as any).userBadge.update({
      where: { id: badgeId },
      data: {
        documents: documents !== undefined ? documents : badge.documents,
        metadata: metadata !== undefined ? metadata : badge.metadata,
      },
    });

    // Invalidate user features cache (in case metadata affects features)
    await this.cacheService.invalidateUserFeatures(userId);

    return updated;
  }

  /**
   * Get all badge types available in the system
   * Users can have multiple badges simultaneously (e.g., teacher + engineer, student + researcher)
   * Filtered by profileMode: professionals see professional badges, students see student badges
   */
  getAvailableBadgeTypes(profileMode: string = 'student') {
    const allBadges = [
      // Professional Badges (for professionals and alumni)
      { type: 'teacher', name: 'Teacher', description: 'University faculty member', requiresVerification: true, profileMode: 'professional' },
      { type: 'engineer', name: 'Engineer', description: 'Professional engineer', requiresVerification: true, profileMode: 'professional' },
      { type: 'doctor', name: 'Doctor', description: 'Medical doctor', requiresVerification: true, profileMode: 'professional' },
      { type: 'chartered_accountant', name: 'Chartered Accountant', description: 'Certified accountant', requiresVerification: true, profileMode: 'professional' },
      { type: 'lawyer', name: 'Lawyer', description: 'Legal professional', requiresVerification: true, profileMode: 'professional' },
      { type: 'architect', name: 'Architect', description: 'Licensed architect', requiresVerification: true, profileMode: 'professional' },
      { type: 'pharmacist', name: 'Pharmacist', description: 'Licensed pharmacist', requiresVerification: true, profileMode: 'professional' },
      { type: 'dentist', name: 'Dentist', description: 'Dental professional', requiresVerification: true, profileMode: 'professional' },
      { type: 'veterinarian', name: 'Veterinarian', description: 'Animal healthcare professional', requiresVerification: true, profileMode: 'professional' },
      { type: 'nurse', name: 'Nurse', description: 'Registered nurse', requiresVerification: true, profileMode: 'professional' },
      { type: 'psychologist', name: 'Psychologist', description: 'Licensed psychologist', requiresVerification: true, profileMode: 'professional' },
      { type: 'consultant', name: 'Consultant', description: 'Business consultant', requiresVerification: false, profileMode: 'professional' },
      { type: 'designer', name: 'Designer', description: 'Design professional', requiresVerification: false, profileMode: 'professional' },
      { type: 'developer', name: 'Developer', description: 'Software developer', requiresVerification: false, profileMode: 'professional' },
      { type: 'analyst', name: 'Analyst', description: 'Data/business analyst', requiresVerification: false, profileMode: 'professional' },
      // Student Badges (for students)
      { type: 'researcher', name: 'Researcher', description: 'Student researcher', requiresVerification: false, profileMode: 'student' },
      { type: 'graduate_teacher', name: 'Graduate Teacher', description: 'Graduate teaching assistant', requiresVerification: false, profileMode: 'student' },
      { type: 'intern', name: 'Intern', description: 'Student intern', requiresVerification: false, profileMode: 'student' },
      { type: 'teaching_assistant', name: 'Teaching Assistant', description: 'Teaching assistant', requiresVerification: false, profileMode: 'student' },
      { type: 'research_assistant', name: 'Research Assistant', description: 'Research assistant', requiresVerification: false, profileMode: 'student' },
    ];

    // Filter badges based on profileMode
    return allBadges.filter(badge => badge.profileMode === profileMode);
  }

  /**
   * Check if user has a specific badge (verified or unverified)
   */
  async hasBadge(userId: string, badgeType: string, verifiedOnly: boolean = false): Promise<boolean> {
    const where: any = {
      userId,
      badgeType,
    };

    if (verifiedOnly) {
      where.verified = true;
    }

    const badge = await (this.prisma as any).userBadge.findUnique({
      where: {
        userId_badgeType: {
          userId,
          badgeType,
        },
      },
    });

    if (!badge) {
      return false;
    }

    return verifiedOnly ? badge.verified : true;
  }

  /**
   * Get all verified badges for a user
   */
  async getVerifiedBadges(userId: string) {
    return (this.prisma as any).userBadge.findMany({
      where: {
        userId,
        verified: true,
      },
      orderBy: { verifiedAt: 'desc' },
    });
  }
}

