import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Profile, Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { ProductsService } from './products.service';

const IMAGES_INTERCEPTOR = FilesInterceptor('images', 5, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Public product catalog with search, category filter, and sorting' })
  listPublic(@Query() query: ListProductsDto) {
    return this.productsService.listPublic(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: "Seller's own product list (all statuses)" })
  listMine(@CurrentUser() user: Profile) {
    return this.productsService.listMine(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @UseInterceptors(IMAGES_INTERCEPTOR)
  @ApiBearerAuth('supabase-jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create product (auto-sets to pending admin approval)' })
  create(
    @CurrentUser() user: Profile,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.create(user.id, dto, files);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @UseInterceptors(IMAGES_INTERCEPTOR)
  @ApiBearerAuth('supabase-jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update product (appends images, resets approval to pending)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: Profile,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.update(id, user.id, dto, files);
  }

  @Put(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @UseInterceptors(IMAGES_INTERCEPTOR)
  @ApiBearerAuth('supabase-jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Replace all product images' })
  replaceImages(
    @Param('id') id: string,
    @CurrentUser() user: Profile,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.replaceImages(id, user.id, files);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Delete product' })
  remove(@Param('id') id: string, @CurrentUser() user: Profile) {
    return this.productsService.remove(id, user.id);
  }
}
