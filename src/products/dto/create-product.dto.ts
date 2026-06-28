import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Premium Silk Blouse' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'A beautiful premium silk blouse...' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'Fashion' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ example: 89.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiPropertyOptional({ example: 120.0, description: 'Crossed-out original price for sale display' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  originalPrice?: number;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock!: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'draft'], default: 'draft' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'draft'])
  status?: string;

  @ApiPropertyOptional({ example: ['silk', 'blouse', 'women'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
