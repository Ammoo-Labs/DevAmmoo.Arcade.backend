import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveBankDetailsDto } from './dto/bank-details.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';

const PLATFORM_FEE = 0.1;
const MINIMUM_WITHDRAWAL = 50;

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(sellerId: string) {
    const [items, txns] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: { sellerId },
        select: {
          price: true,
          quantity: true,
          order: { select: { status: true, paymentStatus: true } },
        },
      }),
      this.prisma.payoutTransaction.findMany({
        where: { sellerId, status: 'completed' },
        select: { amount: true },
      }),
    ]);

    const completedRevenue = items
      .filter(
        (i) =>
          i.order.status === 'completed' && i.order.paymentStatus === 'paid',
      )
      .reduce(
        (sum, i) => sum + Number(i.price) * i.quantity * (1 - PLATFORM_FEE),
        0,
      );

    const pendingRevenue = items
      .filter(
        (i) =>
          ['shipped', 'processing', 'packaged'].includes(i.order.status) &&
          i.order.paymentStatus === 'paid',
      )
      .reduce(
        (sum, i) => sum + Number(i.price) * i.quantity * (1 - PLATFORM_FEE),
        0,
      );

    const totalPaidOut = txns.reduce((sum, t) => sum + Number(t.amount), 0);
    const available = Math.max(0, completedRevenue - totalPaidOut);

    return {
      total: +(completedRevenue + pendingRevenue).toFixed(2),
      pending: +pendingRevenue.toFixed(2),
      available: +available.toFixed(2),
      platformFeePercent: PLATFORM_FEE * 100,
      minimumWithdrawal: MINIMUM_WITHDRAWAL,
    };
  }

  async getTransactions(sellerId: string) {
    return this.prisma.payoutTransaction.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBankDetails(sellerId: string) {
    return this.prisma.bankDetails.findUnique({ where: { sellerId } });
  }

  async saveBankDetails(sellerId: string, dto: SaveBankDetailsDto) {
    return this.prisma.bankDetails.upsert({
      where: { sellerId },
      create: {
        sellerId,
        accountHolder: dto.accountHolder,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        routingNumber: dto.routingNumber ?? '',
        iban: dto.iban,
        accountType: dto.accountType as AccountType,
      },
      update: {
        accountHolder: dto.accountHolder,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        routingNumber: dto.routingNumber ?? '',
        iban: dto.iban,
        accountType: dto.accountType as AccountType,
      },
    });
  }

  async createPayoutRequest(sellerId: string, dto: CreatePayoutRequestDto) {
    const wallet = await this.getWallet(sellerId);

    if (dto.amount > wallet.available) {
      throw new BadRequestException(
        `Requested amount (${dto.amount}) exceeds available balance (${wallet.available})`,
      );
    }

    const [existing, bankDetails] = await Promise.all([
      this.prisma.payoutRequest.findFirst({
        where: { sellerId, status: 'pending' },
      }),
      this.prisma.bankDetails.findUnique({ where: { sellerId } }),
    ]);

    if (existing) {
      throw new BadRequestException('You already have a pending payout request');
    }

    if (!bankDetails) {
      throw new BadRequestException(
        'Please save your bank details before requesting a payout',
      );
    }

    return this.prisma.payoutRequest.create({
      data: {
        sellerId,
        amount: dto.amount,
        bankDetailsSnapshot: { ...bankDetails } as object,
      },
    });
  }

  async getMyRequests(sellerId: string) {
    return this.prisma.payoutRequest.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
