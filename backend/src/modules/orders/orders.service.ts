import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateOrderDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        university: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine currency from user's country
    const currency = user.university?.country?.currency || 'BDT';

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
    });

    if (!vendor || vendor.status !== 'approved') {
      throw new NotFoundException('Vendor not found or not approved');
    }

    // Fetch items and calculate totals
    const items = await this.prisma.vendorItem.findMany({
      where: {
        id: { in: dto.items.map((i) => i.itemId) },
        vendorId: dto.vendorId,
        isActive: true,
      },
    });

    if (items.length !== dto.items.length) {
      throw new BadRequestException('Some items not found or inactive');
    }

    // Check stock and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const orderItem of dto.items) {
      const item = items.find((i) => i.id === orderItem.itemId);
      if (!item) {
        throw new BadRequestException(`Item ${orderItem.itemId} not found`);
      }

      if (item.stockQty !== null && item.stockQty < orderItem.qty) {
        throw new BadRequestException(`Insufficient stock for ${item.title}`);
      }

      const itemSubtotal = (item.price || 0) * orderItem.qty;
      subtotal += itemSubtotal;

      orderItems.push({
        itemId: item.id,
        title: item.title,
        qty: orderItem.qty,
        unitPrice: item.price || 0,
        subtotal: itemSubtotal,
      });
    }

    // Calculate platform fees (configurable, default 5%)
    const platformFeePercent = 0.05; // TODO: Get from settings
    const fees = subtotal * platformFeePercent;
    const total = subtotal + fees;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        vendorId: dto.vendorId,
        subtotal,
        fees,
        total,
        currency,
        paymentMethod: dto.paymentMethod || 'cod',
        paymentStatus: dto.paymentMethod === 'cod' ? 'pending' : 'pending',
        status: 'created',
        deliveryInfo: dto.deliveryInfo || null,
        bookingSlot: dto.bookingSlot || null,
        universityId: user.universityId,
        metadata: dto.metadata || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update stock quantities
    for (const orderItem of dto.items) {
      const item = items.find((i) => i.id === orderItem.itemId);
      if (item && item.stockQty !== null) {
        await this.prisma.vendorItem.update({
          where: { id: item.id },
          data: {
            stockQty: item.stockQty - orderItem.qty,
          },
        });
      }
    }

    // Send order created notification
    try {
      await this.mailService.sendOrderNotification(user.email, order.id, 'created', {
        total: order.total,
        vendor: vendor.businessName,
      });
    } catch (error) {
      console.error('Failed to send order notification:', error);
    }

    return order;
  }

  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only buyer, vendor owner, or admin can view
    if (order.buyerId !== userId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: order.vendorId },
        select: { ownerId: true },
      });

      if (vendor?.ownerId !== userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (user?.role !== 'admin' && user?.role !== 'super_admin') {
          throw new ForbiddenException('Not authorized to view this order');
        }
      }
    }

    return order;
  }

  async confirmOrder(orderId: string, vendorId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.vendorId !== vendorId) {
      throw new NotFoundException('Order not found');
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { ownerId: true },
    });

    if (vendor?.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to confirm this order');
    }

    if (order.status !== 'created') {
      throw new BadRequestException('Order cannot be confirmed in current status');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'confirmed',
      },
      include: {
        buyer: true,
      },
    });

    // Send order confirmed notification
    try {
      if (updated.buyer.email) {
        await this.mailService.sendOrderNotification(updated.buyer.email, orderId, 'confirmed');
      }
    } catch (error) {
      console.error('Failed to send order confirmation notification:', error);
    }

    return updated;
  }

  async fulfillOrder(orderId: string, vendorId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.vendorId !== vendorId) {
      throw new NotFoundException('Order not found');
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { ownerId: true },
    });

    if (vendor?.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to fulfill this order');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException('Order must be confirmed before fulfillment');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'fulfilled',
      },
      include: {
        buyer: true,
      },
    });

    // Send order fulfilled notification
    try {
      if (updated.buyer.email) {
        await this.mailService.sendOrderNotification(updated.buyer.email, orderId, 'fulfilled');
      }
    } catch (error) {
      console.error('Failed to send order fulfillment notification:', error);
    }

    return updated;
  }

  async cancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Buyer or vendor owner can cancel
    const canCancel = order.buyerId === userId;
    let vendorCanCancel = false;

    if (!canCancel) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: order.vendorId },
        select: { ownerId: true },
      });
      vendorCanCancel = vendor?.ownerId === userId;
    }

    if (!canCancel && !vendorCanCancel) {
      throw new ForbiddenException('Not authorized to cancel this order');
    }

    // Check cancellation window (10 minutes)
    const cancellationWindow = 10 * 60 * 1000; // 10 minutes in ms
    const orderAge = Date.now() - order.createdAt.getTime();

    if (orderAge > cancellationWindow && order.buyerId === userId) {
      throw new BadRequestException('Cancellation window has expired');
    }

    // Restore stock if cancelling
    if (order.status === 'created' || order.status === 'confirmed') {
      const orderItems = await this.prisma.orderItem.findMany({
        where: { orderId },
        include: { item: true },
      });

      for (const orderItem of orderItems) {
        if (orderItem.item.stockQty !== null) {
          await this.prisma.vendorItem.update({
            where: { id: orderItem.itemId },
            data: {
              stockQty: orderItem.item.stockQty + orderItem.qty,
            },
          });
        }
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        metadata: {
          ...(order.metadata as any),
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
        },
      },
      include: {
        buyer: true,
      },
    });

    // Send order cancelled notification
    try {
      if (updated.buyer.email) {
        await this.mailService.sendOrderNotification(updated.buyer.email, orderId, 'cancelled');
      }
    } catch (error) {
      console.error('Failed to send order cancellation notification:', error);
    }

    return updated;
  }

  async getMyOrders(userId: string, status?: string) {
    const where: any = { buyerId: userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            item: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVendorOrders(vendorId: string, userId: string, status?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { ownerId: true },
    });

    if (!vendor || vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to view vendor orders');
    }

    const where: any = { vendorId };
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            item: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

