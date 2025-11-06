import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.verificationStatus !== 'approved') {
      throw new ForbiddenException('Only verified users can create groups');
    }

    return this.prisma.group.create({
      data: {
        title: dto.title,
        description: dto.description,
        universityId: dto.universityId || user.universityId,
        programme: dto.programme,
        visibility: dto.visibility || 'university',
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getGroups(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get groups based on visibility
    return this.prisma.group.findMany({
      where: {
        OR: [
          { visibility: 'public' },
          { visibility: 'university', universityId: user.universityId },
          { visibility: 'programme', programme: user.programme },
        ],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async joinGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Alumni can only join alumni circles
    if (group.title.toLowerCase().includes('alumni') && user?.profileMode !== 'alumni') {
      throw new ForbiddenException('Only alumni can join alumni circles');
    }

    // Check if already a member
    const existing = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already a member of this group');
    }

    return this.prisma.groupMember.create({
      data: {
        groupId,
        userId,
      },
    });
  }

  async getMessages(groupId: string, userId: string) {
    // Check if user is a member
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this group');
    }

    return this.prisma.groupMessage.findMany({
      where: { groupId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(groupId: string, userId: string, content: string) {
    // Check if user is a member
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this group');
    }

    return this.prisma.groupMessage.create({
      data: {
        groupId,
        senderId: userId,
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
}

