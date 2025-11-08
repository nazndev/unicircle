import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CountryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all countries (for admin)
   */
  async getAll(activeOnly: boolean = false) {
    const where = activeOnly ? { active: true } : {};
    
    return this.prisma.country.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            universities: true,
          },
        },
      },
    });
  }

  /**
   * Get active countries only (for public API)
   */
  async getActive() {
    return this.prisma.country.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get country by ID
   */
  async getById(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            universities: true,
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  /**
   * Get country by name
   */
  async getByName(name: string) {
    return this.prisma.country.findUnique({
      where: { name },
    });
  }

  /**
   * Create a new country (admin only)
   */
  async create(data: { name: string; code?: string; active?: boolean }) {
    // Check if country already exists
    const existing = await this.prisma.country.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new BadRequestException('Country with this name already exists');
    }

    if (data.code) {
      const existingCode = await this.prisma.country.findUnique({
        where: { code: data.code },
      });

      if (existingCode) {
        throw new BadRequestException('Country with this code already exists');
      }
    }

    return this.prisma.country.create({
      data: {
        name: data.name,
        code: data.code,
        active: data.active ?? false,
      },
    });
  }

  /**
   * Update country (admin only)
   */
  async update(id: string, data: { name?: string; code?: string; active?: boolean }) {
    const country = await this.prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    // Check for name conflicts
    if (data.name && data.name !== country.name) {
      const existing = await this.prisma.country.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new BadRequestException('Country with this name already exists');
      }
    }

    // Check for code conflicts
    if (data.code && data.code !== country.code) {
      const existing = await this.prisma.country.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new BadRequestException('Country with this code already exists');
      }
    }

    return this.prisma.country.update({
      where: { id },
      data,
    });
  }

  /**
   * Activate/Deactivate country (admin only)
   */
  async setActive(id: string, active: boolean) {
    const country = await this.prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return this.prisma.country.update({
      where: { id },
      data: { active },
    });
  }

  /**
   * Delete country (admin only) - only if no universities are associated
   */
  async delete(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            universities: true,
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    if (country._count.universities > 0) {
      throw new BadRequestException(
        'Cannot delete country with associated universities. Deactivate it instead.',
      );
    }

    return this.prisma.country.delete({
      where: { id },
    });
  }
}

