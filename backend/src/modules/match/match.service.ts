import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) {}

  async createMatch(userAId: string, userBId: string) {
    // Check if match already exists
    const existing = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userAId, userBId },
          { userAId: userBId, userBId: userAId },
        ],
      },
    });

    if (existing) {
      return existing;
    }

    // Create match (ensure consistent ordering)
    const [id1, id2] = [userAId, userBId].sort();
    return this.prisma.match.create({
      data: {
        userAId: id1,
        userBId: id2,
      },
    });
  }

  async getMyMatches(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            university: { select: { name: true } },
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            university: { select: { name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return matches.map((match) => ({
      ...match,
      otherUser: match.userAId === userId ? match.userB : match.userA,
    }));
  }
}

