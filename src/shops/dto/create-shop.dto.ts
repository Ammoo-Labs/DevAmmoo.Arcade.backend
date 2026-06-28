import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

class SocialLinksDto {
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() youtube?: string;
  @IsOptional() @IsString() tiktok?: string;
  @IsOptional() @IsString() website?: string;
}

export class CreateShopDto {
  @ApiProperty({ example: "Sarah's Boutique" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  shopName!: string;

  @ApiPropertyOptional({ example: 'Premium fashion for women' })
  @IsOptional()
  @IsString()
  shopDescription?: string;

  @ApiPropertyOptional({ example: '+94 77 999 8888' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'shop@example.com' })
  @IsOptional()
  @IsString()
  shopEmail?: string;

  @ApiPropertyOptional({ description: 'National ID card number' })
  @IsOptional()
  @IsString()
  nic?: string;

  @ApiPropertyOptional({ example: 'national_id' })
  @IsOptional()
  @IsString()
  idType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}
