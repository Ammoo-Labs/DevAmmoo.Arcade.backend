import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, profileImage: true } } },
    });
    return { reviews, count: reviews.length };
  }

  async create(productId: string, userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new ConflictException('You have already reviewed this product');

    const purchased = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { buyerId: userId, status: OrderStatus.completed },
      },
    });
    if (!purchased) {
      throw new ForbiddenException(
        'You can only review products from completed orders',
      );
    }

    const review = await this.prisma.review.create({
      data: { productId, userId, rating: dto.rating, comment: dto.comment },
    });
    await this.recomputeProductRating(productId);
    return review;
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.review.update({
      where: { id },
      data: { rating: dto.rating, comment: dto.comment },
    });
    await this.recomputeProductRating(review.productId);
    return updated;
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();

    await this.prisma.review.delete({ where: { id } });
    await this.recomputeProductRating(review.productId);
    return { message: 'Review deleted' };
  }

  private async recomputeProductRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });
  }
}
