import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['on_hold', 'processing', 'cancelled'],
  on_hold: ['processing', 'cancelled'],
  processing: ['packaged', 'cancelled'],
  packaged: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
};

const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 9.99;
const TAX_RATE = 0.08;

// Maps OMS status values to the NotificationType enum
function toNotificationType(status: string): NotificationType {
  const map: Record<string, NotificationType> = {
    shipped: NotificationType.shipped,
    cancelled: NotificationType.cancelled,
    on_hold: NotificationType.on_hold,
    processing: NotificationType.processing,
    completed: NotificationType.completed,
  };
  return map[status] ?? NotificationType.general;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(buyerId: string, dto: CreateOrderDto) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { id: { in: dto.cartItemIds }, userId: buyerId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            sellerId: true,
            stock: true,
          },
        },
      },
    });

    if (!cartItems.length) throw new BadRequestException('No valid cart items found');

    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}" (${item.product.stock} left)`,
        );
      }
    }

    const subtotal = cartItems.reduce(
      (sum, i) => sum + Number(i.product.price) * i.quantity,
      0,
    );
    const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shipping + tax;

    const shippingAddress = [dto.address, dto.city, dto.postalCode, dto.country]
      .filter(Boolean)
      .join(', ');

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          buyerId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          shippingAddress,
          subtotal,
          tax,
          shipping,
          total,
          status: 'pending',
          paymentStatus: 'paid',
          statusHistory: [
            { status: 'pending', timestamp: new Date().toISOString() },
          ],
          items: {
            create: cartItems.map((i) => ({
              productId: i.productId,
              sellerId: i.product.sellerId, // key fix — correct sellerId per product
              name: i.product.name,
              image: i.product.images[0] ?? '',
              price: i.product.price,
              quantity: i.quantity,
              size: i.size,
              color: i.color,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            sales: { increment: item.quantity },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: { id: { in: cartItems.map((i) => i.id) } },
      });

      // Notify buyer
      await tx.notification.create({
        data: {
          userId: buyerId,
          orderId: created.id,
          message: `Your order has been placed! We'll update you when it's being processed.`,
          type: NotificationType.general,
        },
      });

      // Notify each unique seller
      const sellerIds = [...new Set(cartItems.map((i) => i.product.sellerId))];
      for (const sellerId of sellerIds) {
        await tx.notification.create({
          data: {
            userId: sellerId,
            orderId: created.id,
            message: `New order received — #${created.id.slice(-8).toUpperCase()} needs your attention.`,
            type: NotificationType.general,
          },
        });
      }

      return created;
    });

    return order;
  }

  async getMyOrders(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSellerOrders(sellerId: string) {
    return this.prisma.order.findMany({
      where: { items: { some: { sellerId } } },
      include: { items: { where: { sellerId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string, userRole: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (userRole === Role.admin) return order;
    if (order.buyerId === userId) return order;

    const isSellerInOrder = order.items.some((i) => i.sellerId === userId);
    if (!isSellerInOrder) throw new ForbiddenException();

    return order;
  }

  async updateStatus(
    orderId: string,
    userId: string,
    userRole: Role,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (userRole !== Role.admin) {
      const isSellerInOrder = order.items.some((i) => i.sellerId === userId);
      if (!isSellerInOrder) throw new ForbiddenException();
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from "${order.status}" to "${dto.status}"`,
      );
    }

    const newEntry: Record<string, string> = {
      status: dto.status,
      timestamp: new Date().toISOString(),
    };
    if (dto.note) newEntry.note = dto.note;

    const statusHistory = [
      ...((order.statusHistory as Prisma.JsonArray) ?? []),
      newEntry,
    ] as Prisma.InputJsonValue;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status as any,
          statusHistory,
          adminReviewed: false,
          ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
          ...(dto.handoverProofUrl ? { handoverProof: dto.handoverProofUrl } : {}),
        },
      });

      if (dto.status === 'cancelled') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.notification.create({
        data: {
          userId: order.buyerId,
          orderId,
          message: this.statusMessage(dto.status, orderId),
          type: toNotificationType(dto.status),
        },
      });

      return result;
    });

    return updated;
  }

  async uploadProof(
    orderId: string,
    userId: string,
    userRole: Role,
    file: Express.Multer.File,
  ) {
    if (userRole !== Role.admin) {
      const orderItem = await this.prisma.orderItem.findFirst({
        where: { orderId, sellerId: userId },
      });
      if (!orderItem) throw new ForbiddenException('You have no items in this order');
    }

    const url = await this.storage.upload('order-proofs', `orders/${orderId}`, file);
    return { url };
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAdminReviewed(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { adminReviewed: true },
    });
  }

  private statusMessage(status: string, orderId: string): string {
    const id = orderId.slice(-8).toUpperCase();
    const map: Record<string, string> = {
      on_hold: `Order #${id} is on hold — the seller will update you shortly.`,
      processing: `Order #${id} is being prepared.`,
      packaged: `Order #${id} is packaged and ready for dispatch.`,
      shipped: `Order #${id} is on its way!`,
      completed: `Order #${id} has been delivered. Thank you for shopping!`,
      cancelled: `Order #${id} has been cancelled.`,
    };
    return map[status] ?? `Order #${id} status updated to ${status}.`;
  }
}
