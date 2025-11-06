import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async uploadAlumniDocument(file: Express.Multer.File, userId: string) {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    const fileUrl = `${baseUrl}/uploads/alumni/${file.filename}`;

    return {
      url: fileUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadMarketplaceImage(file: Express.Multer.File, userId: string) {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    const fileUrl = `${baseUrl}/uploads/marketplace/${file.filename}`;

    return {
      url: fileUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    const fileUrl = `${baseUrl}/uploads/avatars/${file.filename}`;

    // Update user avatar
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: fileUrl },
    });

    return {
      url: fileUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}

