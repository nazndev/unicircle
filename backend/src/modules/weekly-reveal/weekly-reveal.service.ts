import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class WeeklyRevealService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  @Cron('0 12 * * 5', {
    timeZone: 'Asia/Dhaka',
  }) // Every Friday at 12:00 PM
  async handleWeeklyReveal() {
    console.log('Running weekly crush reveal...');

    // Find all pending reciprocal crushes
    const crushes = await this.prisma.crush.findMany({
      where: {
        status: 'pending',
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    });

    // Group by user pairs
    const pairs = new Map<string, any[]>();

    for (const crush of crushes) {
      const key = [crush.fromUserId, crush.toUserId].sort().join('-');
      if (!pairs.has(key)) {
        pairs.set(key, []);
      }
      pairs.get(key)!.push(crush);
    }

    // Find mutual crushes
    for (const [key, pairCrushes] of pairs.entries()) {
      if (pairCrushes.length === 2) {
        // Mutual crush found
        const [userA, userB] = pairCrushes[0].fromUserId === pairCrushes[0].toUserId
          ? [pairCrushes[0].fromUser, pairCrushes[0].toUser]
          : [pairCrushes[0].toUser, pairCrushes[0].fromUser];

        // Update crushes to matched
        await this.prisma.crush.updateMany({
          where: {
            OR: [
              { fromUserId: userA.id, toUserId: userB.id },
              { fromUserId: userB.id, toUserId: userA.id },
            ],
          },
          data: { status: 'matched' },
        });

        // Create match if doesn't exist
        const existingMatch = await this.prisma.match.findFirst({
          where: {
            OR: [
              { userAId: userA.id, userBId: userB.id },
              { userAId: userB.id, userBId: userA.id },
            ],
          },
        });

        if (!existingMatch) {
          await this.prisma.match.create({
            data: {
              userAId: userA.id < userB.id ? userA.id : userB.id,
              userBId: userA.id < userB.id ? userB.id : userA.id,
            },
          });
        }

        // Send notifications
        if (userA.email) {
          await this.mailService.sendWeeklyRevealNotification(userA.email, 1);
        }
        if (userB.email) {
          await this.mailService.sendWeeklyRevealNotification(userB.email, 1);
        }
      }
    }

    console.log(`Weekly reveal completed. Processed ${pairs.size} pairs.`);
  }
}

