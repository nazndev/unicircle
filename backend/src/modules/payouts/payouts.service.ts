import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PayoutsService {
  // Payout rules from feature map
  private readonly PAYOUT_RULES = {
    minPayoutAmountUsd: 20,
    payoutCadence: 'weekly', // can be overridden to daily in pilots
    holdPeriodDays: 3, // fraud and refund buffer
  };

  constructor(private prisma: PrismaService) {}

  async runSettlement(vendorId: string, periodStart: Date, periodEnd: Date) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        owner: {
          include: {
            university: {
              include: {
                country: true,
              },
            },
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Determine currency from vendor owner's country (or default to BDT)
    const currency = vendor.owner?.university?.country?.currency || 'BDT';

    // Apply hold period - only include orders older than hold period
    const holdPeriodDate = new Date(periodEnd);
    holdPeriodDate.setDate(holdPeriodDate.getDate() - this.PAYOUT_RULES.holdPeriodDays);

    // Get all fulfilled orders in the period (after hold period)
    const orders = await this.prisma.order.findMany({
      where: {
        vendorId,
        status: 'fulfilled',
        paymentStatus: 'paid',
        createdAt: {
          gte: periodStart,
          lte: holdPeriodDate, // Only include orders after hold period
        },
      },
    });

    const grossSales = orders.reduce((sum, order) => sum + order.total, 0);
    const platformFees = orders.reduce((sum, order) => sum + order.fees, 0);
    const adjustments = 0; // TODO: Calculate refunds and adjustments
    const netPayable = grossSales - platformFees - adjustments;

    // Check minimum payout amount
    if (netPayable < this.PAYOUT_RULES.minPayoutAmountUsd) {
      return {
        message: `Net payable (${netPayable}) is below minimum payout amount (${this.PAYOUT_RULES.minPayoutAmountUsd}). Payout will be included in next cycle.`,
        netPayable,
        minRequired: this.PAYOUT_RULES.minPayoutAmountUsd,
      };
    }

    // Create payout record
    const payout = await this.prisma.payout.create({
      data: {
        vendorId,
        periodStart,
        periodEnd,
        grossSales,
        platformFees,
        adjustments,
        netPayable,
        currency,
        status: 'pending',
      },
    });

    return payout;
  }

  async disbursePayout(payoutId: string, transactionId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { vendor: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new ForbiddenException('Payout is not in pending status');
    }

    // TODO: Integrate with payment gateway (bank/MFS)
    // For now, just mark as processing and then paid

    return this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'processing',
        transactionId,
      },
    });
  }

  async markPayoutPaid(payoutId: string) {
    return this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'paid',
        disbursedAt: new Date(),
      },
    });
  }

  async getVendorPayouts(vendorId: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { ownerId: true },
    });

    if (!vendor || vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to view payouts');
    }

    return this.prisma.payout.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayout(payoutId: string, userId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { vendor: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.vendor.ownerId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        throw new ForbiddenException('Not authorized to view this payout');
      }
    }

    return payout;
  }

  async getVendorStatement(vendorId: string, userId: string, month: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { ownerId: true },
    });

    if (!vendor || vendor.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to view statements');
    }

    const [year, monthNum] = month.split('-').map(Number);
    const periodStart = new Date(year, monthNum - 1, 1);
    const periodEnd = new Date(year, monthNum, 0, 23, 59, 59);

    const orders = await this.prisma.order.findMany({
      where: {
        vendorId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const summary = {
      period: month,
      totalOrders: orders.length,
      grossSales: orders
        .filter((o) => o.status !== 'cancelled' && o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.total, 0),
      platformFees: orders
        .filter((o) => o.status !== 'cancelled' && o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.fees, 0),
      cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
      orders,
    };

    return summary;
  }
}

