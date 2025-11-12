import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get available account types for onboarding (public endpoint, cached)
   * Note: Only student and professional are account types. Alumni and teacher are badges, not account types.
   */
  async getAvailableAccountTypes() {
    // Try cache first
    const cached = await this.cacheService.getCachedSettings();
    if (cached) {
      return {
        student: cached.enableStudentRegistration !== undefined ? cached.enableStudentRegistration : true,
        professional: cached.enableProfessionalRegistration !== undefined ? cached.enableProfessionalRegistration : true,
      };
    }

    // If not cached, fetch from DB
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: {
        enableStudentRegistration: true,
        enableProfessionalRegistration: true,
      } as any,
    });

    const accountTypes = {
      student: settings?.enableStudentRegistration !== undefined ? settings.enableStudentRegistration : true,
      professional: settings?.enableProfessionalRegistration !== undefined ? settings.enableProfessionalRegistration : true,
    };

    // Cache the full settings (will be used by other endpoints too)
    if (settings) {
      const fullSettings = await this.prisma.settings.findUnique({
        where: { id: 'platform' },
      });
      if (fullSettings) {
        await this.cacheService.cacheSettings(fullSettings);
      }
    }

    return accountTypes;
  }

  /**
   * Check if a specific account type registration is enabled (cached)
   * Note: Only student and professional are account types. Alumni and teacher are badges, not account types.
   */
  async isAccountTypeEnabled(accountType: 'student' | 'professional'): Promise<boolean> {
    // Try cache first
    const cached = await this.cacheService.getCachedSettings();
    if (cached) {
      switch (accountType) {
        case 'student':
          return cached.enableStudentRegistration !== undefined ? cached.enableStudentRegistration : true;
        case 'professional':
          return cached.enableProfessionalRegistration !== undefined ? cached.enableProfessionalRegistration : true;
        default:
          return false;
      }
    }

    // If not cached, fetch from DB
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: {
        enableStudentRegistration: true,
        enableProfessionalRegistration: true,
      } as any,
    });

    // Cache the full settings if found
    if (settings) {
      const fullSettings = await this.prisma.settings.findUnique({
        where: { id: 'platform' },
      });
      if (fullSettings) {
        await this.cacheService.cacheSettings(fullSettings);
      }
    }

    if (!settings) {
      return true; // Default to enabled if settings don't exist
    }

    switch (accountType) {
      case 'student':
        return settings.enableStudentRegistration !== undefined ? settings.enableStudentRegistration : true;
      case 'professional':
        return settings.enableProfessionalRegistration !== undefined ? settings.enableProfessionalRegistration : true;
      default:
        return false;
    }
  }

  /**
   * Get age limits and terms for registration (public endpoint, cached)
   */
  async getRegistrationRequirements() {
    // Try cache first
    const cached = await this.cacheService.getCachedSettings();
    if (cached) {
      return {
        minAgeStudent: cached.minAgeStudent || null,
        maxAgeStudent: cached.maxAgeStudent || null,
        minAgeProfessional: cached.minAgeProfessional || null,
        maxAgeProfessional: cached.maxAgeProfessional || null,
        termsMessage: cached.termsMessage || null,
        termsLink: cached.termsLink || null,
      };
    }

    // If not cached, fetch from DB
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: {
        minAgeStudent: true,
        maxAgeStudent: true,
        minAgeProfessional: true,
        maxAgeProfessional: true,
        termsMessage: true,
        termsLink: true,
      } as any,
    });

    const requirements = {
      minAgeStudent: settings?.minAgeStudent || null,
      maxAgeStudent: settings?.maxAgeStudent || null,
      minAgeProfessional: settings?.minAgeProfessional || null,
      maxAgeProfessional: settings?.maxAgeProfessional || null,
      termsMessage: settings?.termsMessage || null,
      termsLink: settings?.termsLink || null,
    };

    // Cache the full settings (will be used by other endpoints too)
    if (settings) {
      const fullSettings = await this.prisma.settings.findUnique({
        where: { id: 'platform' },
      });
      if (fullSettings) {
        await this.cacheService.cacheSettings(fullSettings);
      }
    }

    return requirements;
  }
}

