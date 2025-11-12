import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ApplyVendorDto, CreateLocationDto, CreateItemDto, TargetingDto } from './dto';

@Injectable()
export class VendorService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async applyVendor(dto: ApplyVendorDto, userId?: string) {
    // Check if vendor with email already exists
    const existing = await this.prisma.vendor.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Vendor with this email already exists');
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        businessName: dto.businessName,
        proprietorName: dto.proprietorName,
        email: dto.email,
        phone: dto.phone,
        tradeLicenseOrNID: dto.tradeLicenseOrNID,
        documents: dto.documents || null,
        bankAccount: dto.bankAccount || null,
        ownerId: userId || null,
        status: 'pending',
      },
    });

    // Send application received notification
    try {
      await this.mailService.sendVendorApplicationNotification(dto.email, dto.businessName);
    } catch (error) {
      console.error('Failed to send vendor application notification:', error);
    }

    return vendor;
  }

  async getVendor(vendorId: string, userId?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        locations: true,
        items: { where: { isActive: true } },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Only owner or admin can see full details
    if (userId && vendor.ownerId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        throw new ForbiddenException('Not authorized to view this vendor');
      }
    }

    return vendor;
  }

  async updateVendor(vendorId: string, userId: string, dto: Partial<ApplyVendorDto>) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.ownerId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        throw new ForbiddenException('Not authorized to update this vendor');
      }
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(dto.businessName && { businessName: dto.businessName }),
        ...(dto.proprietorName && { proprietorName: dto.proprietorName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.tradeLicenseOrNID && { tradeLicenseOrNID: dto.tradeLicenseOrNID }),
        ...(dto.documents && { documents: dto.documents }),
        ...(dto.bankAccount && { bankAccount: dto.bankAccount }),
      },
    });
  }

  async createLocation(vendorId: string, userId: string, dto: CreateLocationDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to add locations for this vendor');
    }

    return this.prisma.vendorLocation.create({
      data: {
        vendorId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        schedule: dto.schedule || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateLocation(locationId: string, vendorId: string, userId: string, dto: Partial<CreateLocationDto>) {
    const location = await this.prisma.vendorLocation.findUnique({
      where: { id: locationId },
      include: { vendor: true },
    });

    if (!location || location.vendorId !== vendorId) {
      throw new NotFoundException('Location not found');
    }

    if (location.vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to update this location');
    }

    return this.prisma.vendorLocation.update({
      where: { id: locationId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.schedule && { schedule: dto.schedule }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async createItem(vendorId: string, userId: string, dto: CreateItemDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.status !== 'approved') {
      throw new ForbiddenException('Vendor must be approved to create items');
    }

    if (vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to create items for this vendor');
    }

    return this.prisma.vendorItem.create({
      data: {
        vendorId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        price: dto.price,
        stockQty: dto.stockQty,
        images: dto.images || null,
        fulfillmentType: dto.fulfillmentType || 'pickup',
        schedule: dto.schedule || null,
        campusCoverage: dto.campusCoverage || [],
        metadata: dto.metadata || null,
        isActive: true,
      },
    });
  }

  async updateItem(itemId: string, vendorId: string, userId: string, dto: Partial<CreateItemDto>) {
    const item = await this.prisma.vendorItem.findUnique({
      where: { id: itemId },
      include: { vendor: true },
    });

    if (!item || item.vendorId !== vendorId) {
      throw new NotFoundException('Item not found');
    }

    if (item.vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to update this item');
    }

    return this.prisma.vendorItem.update({
      where: { id: itemId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.stockQty !== undefined && { stockQty: dto.stockQty }),
        ...(dto.images && { images: dto.images }),
        ...(dto.fulfillmentType && { fulfillmentType: dto.fulfillmentType }),
        ...(dto.schedule && { schedule: dto.schedule }),
        ...(dto.campusCoverage && { campusCoverage: dto.campusCoverage }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
    });
  }

  async setTargeting(vendorId: string, userId: string, dto: TargetingDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to set targeting for this vendor');
    }

    // Update all vendor items with campus coverage
    await this.prisma.vendorItem.updateMany({
      where: { vendorId },
      data: {
        campusCoverage: dto.universityIds,
      },
    });

    return { message: 'Targeting updated successfully', universityIds: dto.universityIds };
  }

  async getAnalytics(vendorId: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.ownerId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        throw new ForbiddenException('Not authorized to view analytics');
      }
    }

    const [totalOrders, totalRevenue, activeItems, totalCampaigns] = await Promise.all([
      this.prisma.order.count({
        where: { vendorId, status: { not: 'cancelled' } },
      }),
      this.prisma.order.aggregate({
        where: { vendorId, status: { not: 'cancelled' }, paymentStatus: 'paid' },
        _sum: { total: true },
      }),
      this.prisma.vendorItem.count({
        where: { vendorId, isActive: true },
      }),
      this.prisma.campaign.count({
        where: { vendorId, status: 'active' },
      }),
    ]);

    return {
      vendorId,
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      activeItems,
      totalCampaigns,
      status: vendor.status,
    };
  }

  async getVendorsByCampus(universityId: string) {
    // Get vendors that have items targeting this campus
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: 'approved',
        items: {
          some: {
            isActive: true,
            campusCoverage: {
              has: universityId,
            },
          },
        },
      },
      include: {
        locations: { where: { isActive: true } },
        items: {
          where: {
            isActive: true,
            campusCoverage: {
              has: universityId,
            },
          },
        },
      },
    });

    return vendors;
  }
}

