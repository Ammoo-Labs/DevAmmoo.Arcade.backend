import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Profile, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SaveBankDetailsDto } from './dto/bank-details.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { PayoutsService } from './payouts.service';

@ApiTags('Payouts')
@ApiBearerAuth('supabase-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.seller, Role.admin)
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet summary: total earnings, pending, and available balance' })
  getWallet(@CurrentUser() user: Profile) {
    return this.payoutsService.getWallet(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Payout transaction history' })
  getTransactions(@CurrentUser() user: Profile) {
    return this.payoutsService.getTransactions(user.id);
  }

  @Get('bank-details')
  @ApiOperation({ summary: 'Get saved bank / payment details' })
  getBankDetails(@CurrentUser() user: Profile) {
    return this.payoutsService.getBankDetails(user.id);
  }

  @Put('bank-details')
  @ApiOperation({ summary: 'Create or update bank / payment details' })
  saveBankDetails(@CurrentUser() user: Profile, @Body() dto: SaveBankDetailsDto) {
    return this.payoutsService.saveBankDetails(user.id, dto);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Submit a withdrawal request (requires bank details saved first)' })
  createRequest(@CurrentUser() user: Profile, @Body() dto: CreatePayoutRequestDto) {
    return this.payoutsService.createPayoutRequest(user.id, dto);
  }

  @Get('requests')
  @ApiOperation({ summary: "Seller's payout request history" })
  getMyRequests(@CurrentUser() user: Profile) {
    return this.payoutsService.getMyRequests(user.id);
  }
}
