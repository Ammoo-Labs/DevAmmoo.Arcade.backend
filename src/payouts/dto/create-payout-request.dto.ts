import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreatePayoutRequestDto {
  @ApiProperty({ example: 500.0, description: 'Amount to withdraw (minimum 50)' })
  @IsNumber()
  @Min(50, { message: 'Minimum withdrawal amount is 50' })
  @Type(() => Number)
  amount!: number;
}
