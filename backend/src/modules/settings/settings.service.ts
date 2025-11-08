import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get available account types for onboarding (public endpoint)
   */
  async getAvailableAccountTypes() {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: {
        enableStudentRegistration: true,
        enableAlumniRegistration: true,
        enableTeacherRegistration: true,
      },
    });

    // Default to all enabled if settings don't exist
    // Use !== undefined to preserve false values
    return {
      student: settings?.enableStudentRegistration !== undefined ? settings.enableStudentRegistration : true,
      alumni: settings?.enableAlumniRegistration !== undefined ? settings.enableAlumniRegistration : true,
      teacher: settings?.enableTeacherRegistration !== undefined ? settings.enableTeacherRegistration : true,
    };
  }

  /**
   * Check if a specific account type registration is enabled
   */
  async isAccountTypeEnabled(accountType: 'student' | 'alumni' | 'teacher'): Promise<boolean> {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: {
        enableStudentRegistration: true,
        enableAlumniRegistration: true,
        enableTeacherRegistration: true,
      },
    });

    if (!settings) {
      return true; // Default to enabled if settings don't exist
    }

    switch (accountType) {
      case 'student':
        return settings.enableStudentRegistration !== undefined ? settings.enableStudentRegistration : true;
      case 'alumni':
        return settings.enableAlumniRegistration !== undefined ? settings.enableAlumniRegistration : true;
      case 'teacher':
        return settings.enableTeacherRegistration !== undefined ? settings.enableTeacherRegistration : true;
      default:
        return false;
    }
  }
}

