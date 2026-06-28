import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class SocialLinksDto {
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() youtube?: string;
  @IsOptional() @IsString() tiktok?: string;
  @IsOptional() @IsString() website?: string;
}

export class UpdateShopDto {
  @ApiPropertyOptional() @IsOptional() @IsString() shopName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courierService?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnPolicy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnableItems?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nonReturnableItems?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() exchangePolicy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() exchangeConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnSteps?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() refundInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}

export class SensitiveShopChangesDto {
  @ApiPropertyOptional({ description: 'New shop email (requires admin approval)' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'New contact phone (requires admin approval)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'New address (requires admin approval)' })
  @IsOptional()
  @IsString()
  address?: string;
}
