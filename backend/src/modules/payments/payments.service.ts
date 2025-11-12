import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(userId: string, dto: any) {
    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        context: dto.context, // marketplace | job | premium
        reference: dto.reference,
        amount: dto.amount,
        status: 'pending',
      },
    });

    // In production, integrate with payment gateway (Stripe, Nagad, etc.)
    // For now, return transaction ID for client to process payment
    return {
      transactionId: transaction.id,
      amount: transaction.amount,
      status: transaction.status,
      // paymentUrl: 'https://payment-gateway.com/...'
    };
  }

  async handleWebhook(payload: any) {
    // Handle payment gateway webhook
    // Update transaction status based on payment result
    const transactionId = payload.transactionId || payload.reference;
    
    if (payload.status === 'success' || payload.status === 'paid') {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'paid' },
      });

      // Update related entity (listing, job, etc.)
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (transaction) {
        if (transaction.context === 'marketplace') {
          // Feature listing
          // await this.prisma.marketplaceListing.update...
        } else if (transaction.context === 'job') {
          // Boost job
          // await this.prisma.job.update...
        }
      }

      // Log to audit
      await this.prisma.auditLog.create({
        data: {
          actorId: transaction?.userId,
          action: 'payment_completed',
          entityType: transaction?.context,
          entityId: transaction?.reference,
          metadata: payload,
        },
      });
    }

    return { received: true };
  }

  async handleMfsWebhook(payload: any) {
    // Handle MFS-specific webhook format (bKash, Nagad, Rocket)
    // MFS providers typically send: transactionId, status, amount, reference
    const transactionId = payload.transactionId || payload.trxId || payload.reference;
    
    if (payload.status === 'success' || payload.status === 'completed' || payload.status === 'SUCCESS') {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'paid' },
      });

      // Update related entity
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (transaction) {
        if (transaction.context === 'marketplace') {
          await this.prisma.marketplaceListing.update({
            where: { id: transaction.reference },
            data: { isFeatured: true },
          });
        } else if (transaction.context === 'job') {
          await this.prisma.job.update({
            where: { id: transaction.reference },
            data: { isFeatured: true },
          });
        }
      }

      // Log to audit
      await this.prisma.auditLog.create({
        data: {
          actorId: transaction?.userId,
          action: 'mfs_payment_completed',
          entityType: transaction?.context,
          entityId: transaction?.reference,
          metadata: payload,
        },
      });
    } else if (payload.status === 'failed' || payload.status === 'FAILED') {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'failed' },
      });
    }

    return { received: true };
  }
}

