import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostApprovalStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listPublic(query: ListProductsDto) {
    const { search, category, sort, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.active,
      approvalStatus: PostApprovalStatus.approved,
      shop: { accountStatus: 'active' },
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { tags: { has: search } },
        ],
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'price_asc':
          return { price: Prisma.SortOrder.asc };
        case 'price_desc':
          return { price: Prisma.SortOrder.desc };
        case 'rating':
          return { rating: Prisma.SortOrder.desc };
        case 'popular':
          return { sales: Prisma.SortOrder.desc };
        default:
          return { createdAt: Prisma.SortOrder.desc };
      }
    })();

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          shop: { select: { shopName: true, slug: true, profileImage: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shop: { select: { shopName: true, slug: true, profileImage: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async listMine(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    sellerId: string,
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { sellerId } });
    if (!shop) {
      throw new ForbiddenException('Create a shop before listing products');
    }

    const imageUrls = files?.length
      ? await this.storage.uploadMany('product-images', `products/${shop.id}`, files)
      : [];

    return this.prisma.product.create({
      data: {
        shopId: shop.id,
        sellerId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        price: dto.price,
        originalPrice: dto.originalPrice,
        stock: dto.stock,
        status: (dto.status as ProductStatus) ?? ProductStatus.draft,
        images: imageUrls,
        tags: dto.tags ?? [],
        approvalStatus: PostApprovalStatus.pending,
      },
    });
  }

  async update(
    id: string,
    sellerId: string,
    dto: Partial<CreateProductDto>,
    files: Express.Multer.File[],
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException();

    let images = product.images;
    if (files?.length) {
      const shop = await this.prisma.shop.findUnique({ where: { sellerId } });
      if (shop) {
        const newUrls = await this.storage.uploadMany(
          'product-images',
          `products/${shop.id}`,
          files,
        );
        images = [...images, ...newUrls];
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        price: dto.price,
        originalPrice: dto.originalPrice,
        stock: dto.stock,
        status: dto.status as ProductStatus | undefined,
        tags: dto.tags,
        images,
        approvalStatus: PostApprovalStatus.pending,
        rejectionComment: null,
      },
    });
  }

  async replaceImages(id: string, sellerId: string, files: Express.Multer.File[]) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException();
    if (!files?.length) throw new BadRequestException('No files provided');

    const shop = await this.prisma.shop.findUnique({ where: { sellerId } });
    if (!shop) throw new ForbiddenException();

    const imageUrls = await this.storage.uploadMany(
      'product-images',
      `products/${shop.id}`,
      files,
    );

    return this.prisma.product.update({ where: { id }, data: { images: imageUrls } });
  }

  async remove(id: string, sellerId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException();

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }
}
