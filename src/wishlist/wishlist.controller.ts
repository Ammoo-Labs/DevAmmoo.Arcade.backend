import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Profile } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth('supabase-jwt')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: "Get user's wishlist with product details" })
  getWishlist(@CurrentUser() user: Profile) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  addToWishlist(@CurrentUser() user: Profile, @Param('productId') productId: string) {
    return this.wishlistService.addToWishlist(user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  removeFromWishlist(
    @CurrentUser() user: Profile,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(user.id, productId);
  }

  @Get(':productId/check')
  @ApiOperation({ summary: 'Check if a product is in the wishlist' })
  isInWishlist(@CurrentUser() user: Profile, @Param('productId') productId: string) {
    return this.wishlistService.isInWishlist(user.id, productId);
  }
}
