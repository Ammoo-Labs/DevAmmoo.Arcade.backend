import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListProductsDto {
  @ApiPropertyOptional({ example: 'silk blouse' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Fashion' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['price_asc', 'price_desc', 'rating', 'newest', 'popular'] })
  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'rating', 'newest', 'popular'])
  sort?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
