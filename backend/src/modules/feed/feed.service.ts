import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.verificationStatus !== 'approved' || user.isBlocked) {
      throw new ForbiddenException('Only verified users can create posts');
    }

    return this.prisma.post.create({
      data: {
        authorId: userId,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        visibility: dto.visibility || 'university',
      },
      include: {
        author: {
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
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });
  }

  async getPosts(userId: string, scope: string = 'university', page: number = 1) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { university: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = { isHidden: false };
    
    if (scope === 'university' && user.universityId) {
      where.author = { universityId: user.universityId };
    } else if (scope === 'programme' && user.programme) {
      where.author = { programme: user.programme };
    }
    // 'public' scope shows all posts

    const limit = 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              university: { select: { name: true } },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async likePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.postLike.delete({
        where: { id: existing.id },
      });
      return { liked: false };
    }

    // Like
    await this.prisma.postLike.create({
      data: { postId, userId },
    });
    return { liked: true };
  }

  async commentPost(postId: string, userId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.postComment.create({
      data: {
        postId,
        authorId: userId,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async reportPost(postId: string, userId: string, reason: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.report.create({
      data: {
        reportedById: userId,
        reportedUserId: post.authorId,
        reason,
        contextType: 'post',
        contextId: postId,
      },
    });
  }
}
