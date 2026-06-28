import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Profile } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'List reviews for a product' })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Post('products/:productId/reviews')
  @ApiBearerAuth('supabase-jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a review for a product (requires a completed order)' })
  create(
    @Param('productId') productId: string,
    @CurrentUser() user: Profile,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(productId, user.id, dto);
  }

  @Put('reviews/:id')
  @ApiBearerAuth('supabase-jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update your own review" })
  update(
    @Param('id') id: string,
    @CurrentUser() user: Profile,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.id, dto);
  }

  @Delete('reviews/:id')
  @ApiBearerAuth('supabase-jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete your own review" })
  remove(@Param('id') id: string, @CurrentUser() user: Profile) {
    return this.reviewsService.remove(id, user.id);
  }
}
