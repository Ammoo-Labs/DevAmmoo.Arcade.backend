import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            images: true,
            status: true,
            approvalStatus: true,
            shop: { select: { shopName: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) throw new ConflictException('Product already in wishlist');

    return this.prisma.wishlist.create({ data: { userId, productId } });
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId, productId } });
    return { message: 'Removed from wishlist' };
  }

  async isInWishlist(userId: string, productId: string) {
    const entry = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { inWishlist: !!entry };
  }
}
