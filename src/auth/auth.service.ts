import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Profile, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getMe(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            slug: true,
            profileImage: true,
            approvalStatus: true,
            accountStatus: true,
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.update({
      where: { id: userId },
      data: { ...dto },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            slug: true,
            profileImage: true,
            approvalStatus: true,
            accountStatus: true,
          },
        },
      },
    });
  }

  async elevateToSeller(userId: string) {
    const profile = await this.prisma.profile.findUniqueOrThrow({
      where: { id: userId },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            slug: true,
            profileImage: true,
            approvalStatus: true,
            accountStatus: true,
          },
        },
      },
    });

    if (profile.role === Role.admin) {
      throw new ForbiddenException('Admin accounts cannot become sellers');
    }

    if (profile.role === Role.seller) return profile;

    // Generate a unique slug from the user's name + partial UUID
    const baseSlug = profile.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${userId.slice(0, 8)}`;

    const [updatedProfile, shop] = await this.prisma.$transaction([
      this.prisma.profile.update({
        where: { id: userId },
        data: { role: Role.seller },
      }),
      this.prisma.shop.create({
        data: {
          sellerId: userId,
          shopName: `${profile.name}'s Shop`,
          slug,
        },
        select: {
          id: true,
          shopName: true,
          slug: true,
          profileImage: true,
          approvalStatus: true,
          accountStatus: true,
        },
      }),
    ]);

    return { ...updatedProfile, shop };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const url = await this.storage.upload('avatars', userId, file);
    return this.prisma.profile.update({
      where: { id: userId },
      data: { profileImage: url },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            slug: true,
            profileImage: true,
            approvalStatus: true,
            accountStatus: true,
          },
        },
      },
    });
  }
}
