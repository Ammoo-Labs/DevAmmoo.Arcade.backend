import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, Prisma, ProfileChangeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { SensitiveShopChangesDto, UpdateShopDto } from './dto/update-shop.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list() {
    return this.prisma.shop.findMany({
      where: { approvalStatus: 'approved', accountStatus: AccountStatus.active },
      select: {
        id: true,
        slug: true,
        shopName: true,
        shopDescription: true,
        profileImage: true,
        bannerImage: true,
        _count: {
          select: {
            products: { where: { status: 'active', approvalStatus: 'approved' } },
            followers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug },
      include: {
        products: {
          where: { status: 'active', approvalStatus: 'approved' },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { followers: true } },
      },
    });

    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async getMine(sellerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { sellerId },
      include: {
        _count: { select: { followers: true, products: true } },
      },
    });

    if (!shop) throw new NotFoundException('You do not have a shop yet');
    return shop;
  }

  async create(
    sellerId: string,
    dto: CreateShopDto,
    profilePicture?: Express.Multer.File,
    coverPicture?: Express.Multer.File,
    idPhoto?: Express.Multer.File,
  ) {
    const existing = await this.prisma.shop.findUnique({ where: { sellerId } });
    if (existing) throw new ConflictException('You already have a shop');

    const baseSlug = slugify(dto.shopName);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.shop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const [profileImageUrl, bannerImageUrl] = await Promise.all([
      profilePicture
        ? this.storage.upload('shop-images', `shops/${sellerId}/profile`, profilePicture)
        : Promise.resolve(undefined),
      coverPicture
        ? this.storage.upload('shop-images', `shops/${sellerId}/banner`, coverPicture)
        : Promise.resolve(undefined),
      // idPhoto is uploaded to storage for admin review but has no DB column in this schema version
      idPhoto
        ? this.storage.upload('shop-images', `shops/${sellerId}/id`, idPhoto)
        : Promise.resolve(undefined),
    ]);

    return this.prisma.shop.create({
      data: {
        sellerId,
        shopName: dto.shopName,
        slug,
        shopDescription: dto.shopDescription,
        profileImage: profileImageUrl,
        bannerImage: bannerImageUrl,
        phone: dto.telephone,
        address: dto.address,
        shopEmail: dto.shopEmail,
        nic: dto.nic,
        idType: dto.idType,
        idNumber: dto.idNumber,
        socialLinks: (dto.socialLinks ?? {}) as Prisma.InputJsonValue,
        approvalStatus: 'pending',
        accountStatus: AccountStatus.active,
      },
    });
  }

  async update(sellerId: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({ where: { sellerId } });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.shop.update({
      where: { sellerId },
      data: {
        ...dto,
        socialLinks: dto.socialLinks
          ? (dto.socialLinks as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async updateImages(
    sellerId: string,
    profilePicture?: Express.Multer.File,
    coverPicture?: Express.Multer.File,
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { sellerId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const updates: Partial<{ profileImage: string; bannerImage: string }> = {};

    if (profilePicture) {
      updates.profileImage = await this.storage.upload(
        'shop-images',
        `shops/${sellerId}/profile`,
        profilePicture,
      );
    }
    if (coverPicture) {
      updates.bannerImage = await this.storage.upload(
        'shop-images',
        `shops/${sellerId}/banner`,
        coverPicture,
      );
    }

    if (!Object.keys(updates).length) return shop;
    return this.prisma.shop.update({ where: { sellerId }, data: updates });
  }

  async submitSensitiveChanges(sellerId: string, dto: SensitiveShopChangesDto) {
    const shop = await this.prisma.shop.findUnique({ where: { sellerId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const pending = {
      ...((shop.pendingProfileChanges as object) ?? {}),
      ...dto,
    };

    return this.prisma.shop.update({
      where: { sellerId },
      data: {
        pendingProfileChanges: pending,
        profileChangeStatus: ProfileChangeStatus.pending,
      },
    });
  }

  async follow(userId: string, shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    await this.prisma.shopFollow.upsert({
      where: { followerId_shopId: { followerId: userId, shopId } },
      create: { followerId: userId, shopId },
      update: {},
    });

    return { message: 'Following shop' };
  }

  async unfollow(userId: string, shopId: string) {
    await this.prisma.shopFollow.deleteMany({
      where: { followerId: userId, shopId },
    });
    return { message: 'Unfollowed shop' };
  }

  async isFollowing(userId: string, shopId: string) {
    const follow = await this.prisma.shopFollow.findUnique({
      where: { followerId_shopId: { followerId: userId, shopId } },
    });
    return { following: !!follow };
  }
}
