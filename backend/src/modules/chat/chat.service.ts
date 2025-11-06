import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(matchId: string, userId: string, page: number = 1, limit: number = 50) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Not authorized to view this chat');
    }

    const skip = (page - 1) * limit;
    const messages = await this.prisma.chatMessage.findMany({
      where: { matchId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    return messages.reverse(); // Return in chronological order
  }

  async sendMessage(matchId: string, senderId: string, content: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.userAId !== senderId && match.userBId !== senderId) {
      throw new ForbiddenException('Not authorized to send messages in this chat');
    }

    return this.prisma.chatMessage.create({
      data: {
        matchId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  // Cleanup old messages (should be called by a scheduled job)
  async cleanupOldMessages() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.prisma.chatMessage.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    return { deleted: result.count };
  }
}
