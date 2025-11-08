import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchService } from '../match/match.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class CrushService {
  constructor(
    private prisma: PrismaService,
    private matchService: MatchService,
    private mailService: MailService,
  ) {}

  async sendCrush(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot send crush to yourself');
    }

    // Check if user is verified and is a student
    const fromUser = await this.prisma.user.findUnique({
      where: { id: fromUserId },
      include: { university: true },
    });

    if (!fromUser || fromUser.verificationStatus !== 'approved' || fromUser.isBlocked) {
      throw new ForbiddenException('You must be verified to send crushes');
    }

    // Crush feature is only available for students
    if (fromUser.profileMode !== 'student') {
      throw new ForbiddenException('Crush feature is only available for students');
    }

    const toUser = await this.prisma.user.findUnique({
      where: { id: toUserId },
      include: { university: true },
    });

    if (!toUser || toUser.verificationStatus !== 'approved' || toUser.isBlocked) {
      throw new BadRequestException('Target user not found or not verified');
    }

    // Target user must also be a student
    if (toUser.profileMode !== 'student') {
      throw new BadRequestException('You can only send crushes to students');
    }

    // Check cross-campus rules
    if (fromUser.universityId !== toUser.universityId) {
      if (!fromUser.allowCrossCampus || !toUser.allowCrossCampus) {
        throw new ForbiddenException('Cross-campus matching not enabled');
      }
      if (!fromUser.university?.allowCrossCampus || !toUser.university?.allowCrossCampus) {
        throw new ForbiddenException('Cross-campus matching not allowed by universities');
      }
    }

    // Check if crush already exists
    const existing = await this.prisma.crush.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Crush already sent');
    }

    // Check daily limit (5 crushes per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCrushes = await this.prisma.crush.count({
      where: {
        fromUserId,
        createdAt: { gte: today },
      },
    });

    if (todayCrushes >= 5) {
      throw new BadRequestException('Daily crush limit reached (5 per day)');
    }

    // Create crush
    const crush = await this.prisma.crush.create({
      data: {
        fromUserId,
        toUserId,
        status: 'pending',
      },
    });

    // Check for reciprocal crush
    const reciprocal = await this.prisma.crush.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: toUserId,
          toUserId: fromUserId,
        },
      },
    });

    if (reciprocal) {
      // Create match
      await this.matchService.createMatch(fromUserId, toUserId);
      
      // Update both crushes
      await this.prisma.crush.updateMany({
        where: {
          OR: [
            { fromUserId, toUserId },
            { fromUserId: toUserId, toUserId: fromUserId },
          ],
        },
        data: { status: 'matched' },
      });

      // Send notifications
      if (toUser.email) {
        await this.mailService.sendMatchNotification(toUser.email, fromUser.name || 'Someone');
      }
      if (fromUser.email) {
        await this.mailService.sendMatchNotification(fromUser.email, toUser.name || 'Someone');
      }
    }

    return crush;
  }

  async getMyCrushes(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.crush.findMany({
        where: { fromUserId: userId },
        include: {
          toUser: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              isVerified: true,
              university: { 
                select: { 
                  id: true,
                  name: true,
                  country: true,
                } 
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.crush.findMany({
        where: { toUserId: userId },
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              isVerified: true,
              university: { 
                select: { 
                  id: true,
                  name: true,
                  country: true,
                } 
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { sent, received };
  }

  async getPendingCrushes(userId: string) {
    return this.prisma.crush.findMany({
      where: {
        toUserId: userId,
        status: 'pending',
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            university: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

