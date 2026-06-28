import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// ── User management ───────────────────────────────────────────────────────────

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'suspended', 'banned'] })
  @IsIn(['active', 'inactive', 'suspended', 'banned'])
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignRoleDto {
  @ApiProperty({ enum: ['customer', 'seller', 'admin'] })
  @IsIn(['customer', 'seller', 'admin'])
  role!: string;
}

// ── Product management ────────────────────────────────────────────────────────

export class RejectProductDto {
  @ApiProperty({ example: 'Product images do not meet our quality standards.' })
  @IsString()
  rejectionComment!: string;
}

// ── Shop management ───────────────────────────────────────────────────────────

export class UpdateShopApprovalDto {
  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  @IsIn(['pending', 'approved', 'rejected'])
  approvalStatus!: string;
}

export class UpdateShopAccountStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'suspended', 'banned'] })
  @IsIn(['active', 'inactive', 'suspended', 'banned'])
  accountStatus!: string;
}

export class RejectShopChangesDto {
  @ApiPropertyOptional({ example: 'The requested address could not be verified.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ── Payout management ─────────────────────────────────────────────────────────

export class UpdatePayoutRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;
}

// ── Site settings ─────────────────────────────────────────────────────────────

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() siteName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() siteDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() footerText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() maintenanceMode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowRegistration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableNotifications?: boolean;
}

// ── Hero banners ──────────────────────────────────────────────────────────────

export class CreateBannerDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty({ description: 'Supabase Storage URL of the banner image' })
  @IsString()
  imageUrl!: string;

  @ApiPropertyOptional({ default: 'Shop Now' }) @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional({ default: '/products' }) @IsOptional() @IsString() ctaLink?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() sellerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  salePercentage?: number;
}

export class UpdateBannerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaLink?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() sellerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  salePercentage?: number;
}
