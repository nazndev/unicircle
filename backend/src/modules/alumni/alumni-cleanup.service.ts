import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AlumniCleanupService {
  constructor(private prisma: PrismaService) {}

  @Cron('0 4 * * *') // Daily at 4 AM
  async handleCleanup() {
    console.log('Cleaning up expired alumni documents...');

    // Find approved/rejected alumni approvals older than 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const oldApprovals = await this.prisma.alumniApproval.findMany({
      where: {
        status: {
          in: ['approved', 'rejected'],
        },
        reviewedAt: {
          lt: fifteenDaysAgo,
        },
      },
    });

    let deletedCount = 0;
    for (const approval of oldApprovals) {
      if (approval.documents && typeof approval.documents === 'object') {
        const docs = approval.documents as any;
        if (Array.isArray(docs)) {
          for (const docUrl of docs) {
            if (typeof docUrl === 'string') {
              const filename = docUrl.split('/').pop();
              if (filename) {
                const filePath = path.join('./uploads/alumni', filename);
                try {
                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                  }
                } catch (error) {
                  console.error(`Failed to delete ${filePath}:`, error);
                }
              }
            }
          }
        }
      }
    }

    console.log(`Deleted ${deletedCount} alumni documents`);
  }
}

