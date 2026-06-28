import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
import { CreateShopDto } from './dto/create-shop.dto';
import { SensitiveShopChangesDto, UpdateShopDto } from './dto/update-shop.dto';
import { ShopsService } from './shops.service';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  @ApiOperation({ summary: 'List all approved and active shops' })
  list() {
    return this.shopsService.list();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: "Get seller's own shop details" })
  getMine(@CurrentUser() user: Profile) {
    return this.shopsService.getMine(user.id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get public shop page by URL slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.shopsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profilePicture', maxCount: 1 },
        { name: 'coverPicture', maxCount: 1 },
        { name: 'idPhoto', maxCount: 1 },
      ],
      { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  @ApiBearerAuth('supabase-jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create shop — called as final step of the seller onboarding wizard' })
  create(
    @CurrentUser() user: Profile,
    @Body() dto: CreateShopDto,
    @UploadedFiles()
    files: {
      profilePicture?: Express.Multer.File[];
      coverPicture?: Express.Multer.File[];
      idPhoto?: Express.Multer.File[];
    },
  ) {
    return this.shopsService.create(
      user.id,
      dto,
      files?.profilePicture?.[0],
      files?.coverPicture?.[0],
      files?.idPhoto?.[0],
    );
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Update shop non-sensitive fields' })
  update(@CurrentUser() user: Profile, @Body() dto: UpdateShopDto) {
    return this.shopsService.update(user.id, dto);
  }

  @Put('me/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profilePicture', maxCount: 1 },
        { name: 'coverPicture', maxCount: 1 },
      ],
      { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  @ApiBearerAuth('supabase-jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload / replace shop profile picture or cover banner' })
  updateImages(
    @CurrentUser() user: Profile,
    @UploadedFiles()
    files: {
      profilePicture?: Express.Multer.File[];
      coverPicture?: Express.Multer.File[];
    },
  ) {
    return this.shopsService.updateImages(
      user.id,
      files?.profilePicture?.[0],
      files?.coverPicture?.[0],
    );
  }

  @Put('me/sensitive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.seller, Role.admin)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Request sensitive field changes (email, phone, address) — queued for admin approval' })
  submitSensitiveChanges(
    @CurrentUser() user: Profile,
    @Body() dto: SensitiveShopChangesDto,
  ) {
    return this.shopsService.submitSensitiveChanges(user.id, dto);
  }

  @Post(':shopId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Follow a shop' })
  follow(@CurrentUser() user: Profile, @Param('shopId') shopId: string) {
    return this.shopsService.follow(user.id, shopId);
  }

  @Delete(':shopId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Unfollow a shop' })
  unfollow(@CurrentUser() user: Profile, @Param('shopId') shopId: string) {
    return this.shopsService.unfollow(user.id, shopId);
  }

  @Get(':shopId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Check whether the current user follows a shop' })
  isFollowing(@CurrentUser() user: Profile, @Param('shopId') shopId: string) {
    return this.shopsService.isFollowing(user.id, shopId);
  }
}
