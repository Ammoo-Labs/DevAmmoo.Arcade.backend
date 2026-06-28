import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Profile } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Auth')
@ApiBearerAuth('supabase-jwt')
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (includes shop if seller)' })
  @ApiResponse({ status: 200, description: 'Current profile' })
  getMe(@CurrentUser() user: Profile) {
    return this.authService.getMe(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update profile fields (name, phone, address, city, postalCode, profileImage)' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  updateMe(@CurrentUser() user: Profile, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(user.id, dto);
  }

  @Put('me/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elevate current user to seller role' })
  @ApiResponse({ status: 200, description: 'Profile with seller role' })
  elevateToSeller(@CurrentUser() user: Profile) {
    return this.authService.elevateToSeller(user.id);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload / replace profile avatar' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  uploadAvatar(
    @CurrentUser() user: Profile,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadAvatar(user.id, file);
  }
}
