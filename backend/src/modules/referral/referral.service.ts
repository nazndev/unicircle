import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a unique referral code for a user
   * Format: First 3 letters of email + 6 random alphanumeric characters
   */
  async generateReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, referralCode: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user already has a referral code, return it
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate a unique referral code
    const emailPrefix = user.email.split('@')[0].substring(0, 3).toUpperCase();
    let referralCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      referralCode = `${emailPrefix}${randomSuffix}`;

      const existing = await this.prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      // Fallback to UUID if we can't generate a unique code
      referralCode = `REF${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    }

    // Update user with referral code
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode },
    });

    return referralCode;
  }

  /**
   * Get referral code for a user
   */
  async getReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate if doesn't exist
    if (!user.referralCode) {
      return this.generateReferralCode(userId);
    }

    return user.referralCode;
  }

  /**
   * Validate a referral code and return the referrer user
   */
  async validateReferralCode(referralCode: string): Promise<string | null> {
    if (!referralCode) {
      return null;
    }

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, isBlocked: true },
    });

    if (!referrer || referrer.isBlocked) {
      return null;
    }

    return referrer.id;
  }

  /**
   * Award referral points when a new user signs up
   */
  async awardSignupPoints(referrerId: string, newUserId: string): Promise<void> {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
    }) as any;

    if (!settings || !settings.enableReferralSystem) {
      return; // Referral system disabled
    }

    const pointsPerSignup = settings.referralPointsPerSignup || 10;

    // Award points to referrer
    await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        referralPoints: {
          increment: pointsPerSignup,
        },
      },
    });

    console.log(`[REFERRAL] Awarded ${pointsPerSignup} points to referrer ${referrerId} for signup of ${newUserId}`);
  }

  /**
   * Award referral points when a referred user verifies their account
   */
  async awardVerificationPoints(referrerId: string, verifiedUserId: string): Promise<void> {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
    }) as any;

    if (!settings || !settings.enableReferralSystem) {
      return; // Referral system disabled
    }

    const pointsPerVerification = settings.referralPointsPerVerification || 20;

    // Award points to referrer
    await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        referralPoints: {
          increment: pointsPerVerification,
        },
      },
    });

    console.log(`[REFERRAL] Awarded ${pointsPerVerification} points to referrer ${referrerId} for verification of ${verifiedUserId}`);
  }

  /**
   * Award bonus points if referred user is from same domain (university or organization)
   */
  async awardDomainMatchBonus(referrerId: string, newUserId: string): Promise<void> {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
    }) as any;

    if (!settings || !settings.enableReferralSystem) {
      return; // Referral system disabled
    }

    const pointsPerDomainMatch = settings.referralPointsPerDomainMatch || 5;

    // Get referrer and new user details
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { universityId: true, organizationId: true },
    }) as any;

    const newUser = await this.prisma.user.findUnique({
      where: { id: newUserId },
      select: { universityId: true, organizationId: true },
    }) as any;

    if (!referrer || !newUser) {
      return;
    }

    // Check if same university or same organization
    const sameUniversity = referrer.universityId && newUser.universityId && referrer.universityId === newUser.universityId;
    const sameOrganization = referrer.organizationId && newUser.organizationId && referrer.organizationId === newUser.organizationId;

    if (sameUniversity || sameOrganization) {
      // Award bonus points
      await this.prisma.user.update({
        where: { id: referrerId },
        data: {
          referralPoints: {
            increment: pointsPerDomainMatch,
          },
        },
      });

      console.log(`[REFERRAL] Awarded ${pointsPerDomainMatch} bonus points to referrer ${referrerId} for domain match (${sameUniversity ? 'university' : 'organization'})`);
    }
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralPoints: true,
        referrals: {
          select: {
            id: true,
            email: true,
            name: true,
            isVerified: true,
            createdAt: true,
            university: {
              select: { name: true },
            },
            organization: {
              select: { name: true },
            },
          },
        },
      },
    }) as any;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalReferrals = user.referrals?.length || 0;
    const verifiedReferrals = user.referrals?.filter((r: any) => r.isVerified)?.length || 0;
    const pendingReferrals = totalReferrals - verifiedReferrals;

    return {
      referralCode: user.referralCode,
      totalPoints: user.referralPoints || 0,
      totalReferrals,
      verifiedReferrals,
      pendingReferrals,
      referrals: user.referrals || [],
    };
  }
}

