import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UniversityService {
  constructor(private prisma: PrismaService) {}

  async getAll(countryId?: string) {
    // Build country filter - only show universities from active countries
    const where: any = {
      active: true,
      country: {
        active: true, // Only show universities from active countries
      },
    };

    if (countryId) {
      // Verify the country is active
      const country = await this.prisma.country.findUnique({
        where: { id: countryId },
      });

      if (!country || !country.active) {
        return []; // Country not found or inactive
      }

      where.countryId = countryId;
    }

    return this.prisma.university.findMany({
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
      orderBy: { name: 'asc' },
    });
  }

  async getCountries() {
    // Return only active countries that have universities
    const countries = await this.prisma.country.findMany({
      where: {
        active: true,
        universities: {
          some: {
            active: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    return countries;
  }

  async getByDomain(domain: string) {
    const university = await this.prisma.university.findFirst({
      where: {
        domain,
        active: true,
        country: {
          active: true, // Only return if country is active
        },
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    return university;
  }
}


