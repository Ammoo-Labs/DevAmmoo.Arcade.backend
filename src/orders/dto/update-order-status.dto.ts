import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const VALID_STATUSES = [
  'pending',
  'on_hold',
  'processing',
  'packaged',
  'shipped',
  'completed',
  'cancelled',
] as const;

export type OrderStatusValue = (typeof VALID_STATUSES)[number];

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: VALID_STATUSES,
    example: 'processing',
  })
  @IsIn(VALID_STATUSES)
  status!: OrderStatusValue;

  @ApiPropertyOptional({ example: 'TRK-123456' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'URL of handover proof image (from POST /orders/:id/proof)' })
  @IsOptional()
  @IsString()
  handoverProofUrl?: string;

  @ApiPropertyOptional({ example: 'Handed to DHL courier' })
  @IsOptional()
  @IsString()
  note?: string;
}
