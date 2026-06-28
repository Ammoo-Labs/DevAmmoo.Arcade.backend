import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            images: true,
            stock: true,
            status: true,
            approvalStatus: true,
            shop: { select: { shopName: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const subtotal = items.reduce(
      (sum, i) => sum + Number(i.product.price) * i.quantity,
      0,
    );

    return { items, subtotal, itemCount: items.length };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== 'active' || product.approvalStatus !== 'approved') {
      throw new BadRequestException('This product is not available');
    }
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Only ${product.stock} units available in stock`,
      );
    }

    // Merge if same product + same variant already in cart
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId: dto.productId,
        size: dto.size ?? null,
        color: dto.color ?? null,
      },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: dto.quantity } },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
        size: dto.size,
        color: dto.color,
      },
    });
  }

  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: { select: { stock: true } } },
    });

    if (!item) throw new NotFoundException('Cart item not found');
    if (item.userId !== userId) throw new ForbiddenException();
    if (item.product.stock < dto.quantity) {
      throw new BadRequestException(
        `Only ${item.product.stock} units available in stock`,
      );
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(userId: string, cartItemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!item) throw new NotFoundException('Cart item not found');
    if (item.userId !== userId) throw new ForbiddenException();

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { message: 'Cart cleared' };
  }
}
