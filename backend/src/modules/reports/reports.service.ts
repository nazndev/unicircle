import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async createReport(userId: string, dto: any) {
    return this.prisma.report.create({
      data: {
        reportedById: userId,
        reportedUserId: dto.reportedUserId,
        reason: dto.reason,
        contextType: dto.contextType, // match | chat | circle | post | job | marketplace
        contextId: dto.contextId,
      },
    });
  }
}

