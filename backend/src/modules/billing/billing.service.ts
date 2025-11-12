import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutDto } from './dto';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  // Pricing plans
  private readonly PRICING = {
    marketplace_feature: { price: 5, durationDays: 7 },
    vendor_boost: { price: 20, impressionsGuarantee: 5000 },
    job_posting_basic: { price: 15, durationDays: 30 },
    premium_badge_verification: { price: 2 },
  };

  async checkout(userId: string, dto: CheckoutDto) {
    const pricing = this.PRICING[dto.context as keyof typeof this.PRICING];
    if (!pricing) {
      throw new BadRequestException('Invalid billing context');
    }

    // Get user's country to determine currency
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

    const currency = user?.university?.country?.currency || 'BDT';

    // Verify reference exists
    let referenceExists = false;
    switch (dto.context) {
      case 'marketplace_feature':
        const listing = await this.prisma.marketplaceListing.findUnique({
          where: { id: dto.referenceId },
        });
        referenceExists = !!listing;
        break;
      case 'job_posting':
        const job = await this.prisma.job.findUnique({
          where: { id: dto.referenceId },
        });
        referenceExists = !!job;
        break;
      case 'vendor_boost':
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: dto.referenceId },
        });
        referenceExists = !!vendor;
        break;
      case 'premium_badge':
        // Badge verification doesn't need reference check
        referenceExists = true;
        break;
    }

    if (!referenceExists) {
      throw new NotFoundException('Reference item not found');
    }

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        userId,
        context: dto.context,
        referenceId: dto.referenceId,
        amount: pricing.price,
        currency,
        status: 'pending',
        paymentMethod: dto.paymentMethod,
      },
    });

    // TODO: Integrate with payment gateway
    // For now, return invoice with payment intent

    return {
      invoice,
      paymentIntent: {
        id: `pi_${invoice.id}`,
        clientSecret: `secret_${invoice.id}`,
        amount: pricing.price,
        currency,
      },
    };
  }

  async markInvoicePaid(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Apply the feature based on context
    await this.applyFeature(invoice);

    return updated;
  }

  private async applyFeature(invoice: any) {
    switch (invoice.context) {
      case 'marketplace_feature':
        await this.prisma.marketplaceListing.update({
          where: { id: invoice.referenceId },
          data: { isFeatured: true },
        });
        break;
      case 'job_posting':
        await this.prisma.job.update({
          where: { id: invoice.referenceId },
          data: { isFeatured: true },
        });
        break;
      case 'vendor_boost':
        // Create campaign
        const pricing = this.PRICING.vendor_boost;
        await this.prisma.campaign.create({
          data: {
            vendorId: invoice.referenceId,
            type: 'boosted',
            impressionsGuarantee: pricing.impressionsGuarantee,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            status: 'active',
            invoiceId: invoice.id,
          },
        });
        break;
      case 'premium_badge':
        // Badge verification is handled separately
        break;
    }
  }

  async getMyInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(invoiceId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        throw new NotFoundException('Invoice not found');
      }
    }

    return invoice;
  }

  async getInvoicePDF(invoiceId: string, userId: string) {
    const invoice = await this.getInvoice(invoiceId, userId);

    // TODO: Generate PDF
    // For now, return invoice data
    return {
      invoice,
      pdfUrl: invoice.pdfUrl || null,
    };
  }

  async getPricingPlans() {
    return {
      plans: Object.entries(this.PRICING).map(([context, pricing]) => ({
        context,
        ...pricing,
      })),
    };
  }
}

