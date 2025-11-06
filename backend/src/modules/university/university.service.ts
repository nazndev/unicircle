import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UniversityService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.university.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }
}

