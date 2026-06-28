import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  NotificationType,
  PostApprovalStatus,
  Prisma,
  ProfileChangeStatus,
  Role,
  ShopApprovalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignRoleDto,
  CreateBannerDto,
  RejectProductDto,
  RejectShopChangesDto,
  UpdateBannerDto,
  UpdatePayoutRequestDto,
  UpdateShopAccountStatusDto,
  UpdateShopApprovalDto,
  UpdateSiteSettingsDto,
  UpdateUserStatusDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Dashboard stats ──────────────────────────────────────────────────────────

  async getStats() {
    const [
      totalUsers,
      totalSellers,
      totalOrders,
      pendingOrders,
      pendingProducts,
      revenueResult,
      pendingShops,
    ] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.profile.count({ where: { role: Role.seller } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.product.count({ where: { approvalStatus: PostApprovalStatus.pending } }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: 'completed', paymentStatus: 'paid' },
      }),
      this.prisma.shop.count({ where: { approvalStatus: ShopApprovalStatus.pending } }),
    ]);

    return {
      users: {
        total: totalUsers,
        sellers: totalSellers,
        customers: totalUsers - totalSellers,
      },
      orders: { total: totalOrders, pending: pendingOrders },
      products: { pendingApproval: pendingProducts },
      shops: { pendingApproval: pendingShops },
      revenue: { total: +(Number(revenueResult._sum.total ?? 0)).toFixed(2) },
    };
  }

  // ── User management ──────────────────────────────────────────────────────────

  async getUsers(role?: string) {
    return this.prisma.profile.findMany({
      where: role ? { role: role as Role } : undefined,
      include: { shop: { select: { shopName: true, approvalStatus: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    return this.prisma.profile.update({
      where: { id: userId },
      data: { accountStatus: dto.status as AccountStatus },
    });
  }

  async assignRole(userId: string, dto: AssignRoleDto) {
    return this.prisma.profile.update({
      where: { id: userId },
      data: { role: dto.role as Role },
    });
  }

  // ── Product management ───────────────────────────────────────────────────────

  async getProducts(approvalStatus?: string) {
    return this.prisma.product.findMany({
      where: approvalStatus
        ? { approvalStatus: approvalStatus as PostApprovalStatus }
        : undefined,
      include: {
        shop: { select: { shopName: true, slug: true } },
        seller: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: PostApprovalStatus.approved,
        rejectionComment: null,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: product.sellerId,
        message: `Your product "${product.name}" has been approved and is now live!`,
        type: NotificationType.general,
      },
    });

    return updated;
  }

  async rejectProduct(productId: string, dto: RejectProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: PostApprovalStatus.rejected,
        rejectionComment: dto.rejectionComment,
        status: 'inactive',
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: product.sellerId,
        message: `Your product "${product.name}" was not approved. Reason: ${dto.rejectionComment}`,
        type: NotificationType.general,
      },
    });

    return updated;
  }

  async setProductUnderReview(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id: productId },
      data: { approvalStatus: PostApprovalStatus.under_review },
    });
  }

  // ── Shop management ──────────────────────────────────────────────────────────

  async getShops(approvalStatus?: string) {
    return this.prisma.shop.findMany({
      where: approvalStatus
        ? { approvalStatus: approvalStatus as ShopApprovalStatus }
        : undefined,
      include: {
        seller: { select: { name: true, phone: true } },
        _count: { select: { products: true, followers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateShopApproval(shopId: string, dto: UpdateShopApprovalDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: { approvalStatus: dto.approvalStatus as ShopApprovalStatus },
    });

    const isApproved = dto.approvalStatus === 'approved';
    await this.prisma.notification.create({
      data: {
        userId: shop.sellerId,
        message: isApproved
          ? `Congratulations! Your shop "${shop.shopName}" has been approved.`
          : `Your shop "${shop.shopName}" application status updated to: ${dto.approvalStatus}.`,
        type: NotificationType.general,
      },
    });

    return updated;
  }

  async updateShopAccountStatus(shopId: string, dto: UpdateShopAccountStatusDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.shop.update({
      where: { id: shopId },
      data: { accountStatus: dto.accountStatus as AccountStatus },
    });
  }

  async approveShopChanges(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const pending = (shop.pendingProfileChanges as Record<string, unknown>) ?? {};

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...pending,
        pendingProfileChanges: Prisma.DbNull,
        profileChangeStatus: ProfileChangeStatus.none,
        accountStatus: AccountStatus.active,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: shop.sellerId,
        message: `Your shop profile changes for "${shop.shopName}" have been approved.`,
        type: NotificationType.general,
      },
    });

    return updated;
  }

  async rejectShopChanges(shopId: string, dto: RejectShopChangesDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        pendingProfileChanges: Prisma.DbNull,
        profileChangeStatus: ProfileChangeStatus.none,
        accountStatus: AccountStatus.active,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: shop.sellerId,
        message: dto.reason
          ? `Your shop profile change request was rejected. Reason: ${dto.reason}`
          : `Your shop profile change request was not approved.`,
        type: NotificationType.general,
      },
    });

    return updated;
  }

  // ── Order management ─────────────────────────────────────────────────────────

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markOrderReviewed(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { adminReviewed: true },
    });
  }

  // ── Payout management ────────────────────────────────────────────────────────

  async getPayoutRequests(status?: string) {
    return this.prisma.payoutRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        seller: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePayoutRequest(id: string, dto: UpdatePayoutRequestDto) {
    const req = await this.prisma.payoutRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Payout request not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payoutRequest.update({
        where: { id },
        data: { status: dto.status, adminNote: dto.adminNote },
      });

      if (dto.status === 'approved') {
        await tx.payoutTransaction.create({
          data: {
            sellerId: req.sellerId,
            amount: req.amount,
            status: 'completed',
            payoutRequestId: id,
          },
        });
      }

      const message =
        dto.status === 'approved'
          ? `Your payout request for ${Number(req.amount).toFixed(2)} has been approved!`
          : `Your payout request was rejected.${dto.adminNote ? ` Note: ${dto.adminNote}` : ''}`;

      await tx.notification.create({
        data: {
          userId: req.sellerId,
          message,
          type: NotificationType.general,
        },
      });

      return updated;
    });
  }

  // ── Site settings ────────────────────────────────────────────────────────────

  async getSiteSettings() {
    const settings = await this.prisma.siteSettings.findFirst();
    if (!settings) return this.prisma.siteSettings.create({ data: {} });
    return settings;
  }

  async updateSiteSettings(dto: UpdateSiteSettingsDto) {
    const settings = await this.prisma.siteSettings.findFirst();
    if (!settings) {
      return this.prisma.siteSettings.create({ data: { ...dto } });
    }
    return this.prisma.siteSettings.update({
      where: { id: settings.id },
      data: { ...dto },
    });
  }

  // ── Hero banners ─────────────────────────────────────────────────────────────

  async getBanners() {
    return this.prisma.heroBanner.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createBanner(dto: CreateBannerDto) {
    return this.prisma.heroBanner.create({ data: { ...dto } });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.heroBanner.update({ where: { id }, data: { ...dto } });
  }

  async deleteBanner(id: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    await this.prisma.heroBanner.delete({ where: { id } });
    return { message: 'Banner deleted' };
  }

  async toggleBanner(id: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.heroBanner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });
  }
}
