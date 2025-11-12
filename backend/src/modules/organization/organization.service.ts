import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async getAll(countryId?: string) {
    // Build country filter - only show organizations from active countries
    const where: any = {
      active: true,
      country: {
        active: true, // Only show organizations from active countries
      },
    };

    if (countryId) {
      // Verify the country is active
      const country = await (this.prisma as any).country.findUnique({
        where: { id: countryId },
      });

      if (!country || !country.active) {
        return []; // Country not found or inactive
      }

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
      },
      orderBy: { name: 'asc' },
    });
  }

  async getByDomain(domain: string) {
    const organization = await (this.prisma as any).organization.findFirst({
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
    return organization;
  }
}

