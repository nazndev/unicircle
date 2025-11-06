import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async createListing(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.verificationStatus !== 'approved' || user.isBlocked) {
      throw new ForbiddenException('Only verified users can create listings');
    }

    return this.prisma.marketplaceListing.create({
      data: {
        type: dto.type,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        location: dto.location,
        universityId: dto.universityId || user.universityId,
        ownerId: userId,
        images: dto.images || [],
        contactInfo: dto.contactInfo,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getListings(userId: string, filters: any = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = { isActive: true };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.universityId) {
      where.universityId = filters.universityId;
    } else if (user.universityId) {
      // Default to user's university
      where.universityId = user.universityId;
    }

    if (filters.featured) {
      where.isFeatured = true;
    }

    const limit = 20;
    const skip = filters.page ? (filters.page - 1) * limit : 0;

    const [listings, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip,
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);

    return {
      listings,
      pagination: {
        page: filters.page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getListing(id: string, userId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            university: { select: { name: true } },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  async updateListing(id: string, userId: string, dto: any) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to update this listing');
    }

    return this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price,
        location: dto.location,
        images: dto.images,
        contactInfo: dto.contactInfo,
        isActive: dto.isActive,
      },
    });
  }

  async deleteListing(id: string, userId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to delete this listing');
    }

    await this.prisma.marketplaceListing.delete({
      where: { id },
    });

    return { message: 'Listing deleted successfully' };
  }

  async featureListing(id: string, userId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to feature this listing');
    }

    // In production, this would trigger a payment flow
    // For now, just mark as featured
    return this.prisma.marketplaceListing.update({
      where: { id },
      data: { isFeatured: true },
    });
  }

  async reportListing(id: string, userId: string, reason: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.prisma.report.create({
      data: {
        reportedById: userId,
        reportedUserId: listing.ownerId,
        reason,
        contextType: 'marketplace',
        contextId: id,
      },
    });
  }

  // Auto-expire listings after 60 days
  async expireOldListings() {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const result = await this.prisma.marketplaceListing.updateMany({
      where: {
        createdAt: {
          lt: sixtyDaysAgo,
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return { expired: result.count };
  }
}
