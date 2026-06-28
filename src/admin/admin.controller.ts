import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  AssignRoleDto,
  CreateBannerDto,
  RejectProductDto,
  RejectShopChangesDto,
  UpdateBannerDto,
  UpdatePayoutRequestDto,
  UpdateShopAccountStatusDto,
  UpdateShopApprovalDto,
  UpdateSiteSettingsDto,
  UpdateUserStatusDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth('supabase-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Stats ────────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Admin dashboard aggregate stats' })
  getStats() {
    return this.adminService.getStats();
  }

  // ── Users ────────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users (optionally filter by role)' })
  @ApiQuery({ name: 'role', required: false, enum: ['customer', 'seller', 'admin'] })
  getUsers(@Query('role') role?: string) {
    return this.adminService.getUsers(role);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user account status (ban/suspend/activate)' })
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Assign a role to a user' })
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.adminService.assignRole(id, dto);
  }

  // ── Products ─────────────────────────────────────────────────────────────────

  @Get('products')
  @ApiOperation({ summary: 'List products (optionally filter by approvalStatus)' })
  @ApiQuery({ name: 'approvalStatus', required: false, enum: ['pending', 'approved', 'rejected', 'under_review'] })
  getProducts(@Query('approvalStatus') approvalStatus?: string) {
    return this.adminService.getProducts(approvalStatus);
  }

  @Put('products/:id/approve')
  @ApiOperation({ summary: 'Approve a product listing' })
  approveProduct(@Param('id') id: string) {
    return this.adminService.approveProduct(id);
  }

  @Put('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product listing with a comment' })
  rejectProduct(@Param('id') id: string, @Body() dto: RejectProductDto) {
    return this.adminService.rejectProduct(id, dto);
  }

  @Put('products/:id/review')
  @ApiOperation({ summary: 'Mark a product as under review' })
  setProductUnderReview(@Param('id') id: string) {
    return this.adminService.setProductUnderReview(id);
  }

  // ── Shops ────────────────────────────────────────────────────────────────────

  @Get('shops')
  @ApiOperation({ summary: 'List all shops (optionally filter by approvalStatus)' })
  @ApiQuery({ name: 'approvalStatus', required: false, enum: ['pending', 'approved', 'rejected'] })
  getShops(@Query('approvalStatus') approvalStatus?: string) {
    return this.adminService.getShops(approvalStatus);
  }

  @Put('shops/:id/approval')
  @ApiOperation({ summary: 'Approve or reject a shop application' })
  updateShopApproval(@Param('id') id: string, @Body() dto: UpdateShopApprovalDto) {
    return this.adminService.updateShopApproval(id, dto);
  }

  @Put('shops/:id/status')
  @ApiOperation({ summary: 'Set shop account status (ban/suspend/activate)' })
  updateShopAccountStatus(@Param('id') id: string, @Body() dto: UpdateShopAccountStatusDto) {
    return this.adminService.updateShopAccountStatus(id, dto);
  }

  @Put('shops/:id/changes/approve')
  @ApiOperation({ summary: 'Approve pending sensitive profile changes for a shop' })
  approveShopChanges(@Param('id') id: string) {
    return this.adminService.approveShopChanges(id);
  }

  @Put('shops/:id/changes/reject')
  @ApiOperation({ summary: 'Reject pending sensitive profile changes for a shop' })
  rejectShopChanges(@Param('id') id: string, @Body() dto: RejectShopChangesDto) {
    return this.adminService.rejectShopChanges(id, dto);
  }

  // ── Orders ───────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'All orders in the system' })
  getAllOrders() {
    return this.adminService.getAllOrders();
  }

  @Put('orders/:id/reviewed')
  @ApiOperation({ summary: 'Mark an order as admin-reviewed' })
  markOrderReviewed(@Param('id') id: string) {
    return this.adminService.markOrderReviewed(id);
  }

  // ── Payouts ──────────────────────────────────────────────────────────────────

  @Get('payouts/requests')
  @ApiOperation({ summary: 'All payout requests (optionally filter by status)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  getPayoutRequests(@Query('status') status?: string) {
    return this.adminService.getPayoutRequests(status);
  }

  @Put('payouts/requests/:id')
  @ApiOperation({ summary: 'Approve or reject a payout request (creates transaction on approval)' })
  updatePayoutRequest(@Param('id') id: string, @Body() dto: UpdatePayoutRequestDto) {
    return this.adminService.updatePayoutRequest(id, dto);
  }

  // ── Site settings ────────────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get site settings (singleton)' })
  getSiteSettings() {
    return this.adminService.getSiteSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update site settings' })
  updateSiteSettings(@Body() dto: UpdateSiteSettingsDto) {
    return this.adminService.updateSiteSettings(dto);
  }

  // ── Banners ──────────────────────────────────────────────────────────────────

  @Get('banners')
  @ApiOperation({ summary: 'List all hero banners' })
  getBanners() {
    return this.adminService.getBanners();
  }

  @Post('banners')
  @ApiOperation({ summary: 'Create a new hero banner' })
  createBanner(@Body() dto: CreateBannerDto) {
    return this.adminService.createBanner(dto);
  }

  @Put('banners/:id')
  @ApiOperation({ summary: 'Update a hero banner' })
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.adminService.updateBanner(id, dto);
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete a hero banner' })
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(id);
  }

  @Put('banners/:id/toggle')
  @ApiOperation({ summary: 'Toggle hero banner active/inactive state' })
  toggleBanner(@Param('id') id: string) {
    return this.adminService.toggleBanner(id);
  }
}
