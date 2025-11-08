import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AlumniCleanupService {
  private readonly storageBasePath: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Get storage path from environment variable (same as upload service uses)
    const envStoragePath = this.configService.get<string>('STORAGE_PATH');
    if (envStoragePath) {
      // Use absolute path from env if provided
      this.storageBasePath = path.isAbsolute(envStoragePath) 
        ? envStoragePath 
        : path.resolve(process.cwd(), envStoragePath);
    } else {
      // Default: storage folder outside backend (at project root)
      this.storageBasePath = path.resolve(__dirname, '../../../storage');
    }
  }

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
              // Extract path from URL: /storage/documents/{country}/{university}/{user}/{filename}
              // Or old format: /uploads/alumni/{filename}
              let filePath: string;
              if (docUrl.includes('/storage/')) {
                // New structure: extract relative path from URL
                const urlParts = docUrl.split('/storage/');
                if (urlParts.length > 1) {
                  filePath = path.join(this.storageBasePath, urlParts[1]);
                } else {
                  continue; // Skip if URL format is unexpected
                }
              } else {
                // Old structure: /uploads/alumni/{filename}
                const filename = docUrl.split('/').pop();
                if (filename) {
                  filePath = path.join('./uploads/alumni', filename);
                } else {
                  continue;
                }
              }
              
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

    console.log(`Deleted ${deletedCount} alumni documents`);
  }
}

