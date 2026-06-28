import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const ACCOUNT_TYPES = ['savings', 'checking'] as const;

export class SaveBankDetailsDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  accountHolder!: string;

  @ApiProperty({ example: '001234567890' })
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @ApiProperty({ example: 'Bank of Ceylon' })
  @IsString()
  @IsNotEmpty()
  bankName!: string;

  @ApiPropertyOptional({ example: '021000021', description: 'Routing / SWIFT number' })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiPropertyOptional({ example: 'GB29NWBK60161331926819', description: 'IBAN (international accounts)' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiProperty({ enum: ACCOUNT_TYPES, example: 'savings' })
  @IsIn(ACCOUNT_TYPES)
  accountType!: (typeof ACCOUNT_TYPES)[number];
}
