import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Profile, Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth('supabase-jwt')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place an order from selected cart items' })
  create(@CurrentUser() user: Profile, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: "Buyer's own order history" })
  getMyOrders(@CurrentUser() user: Profile) {
    return this.ordersService.getMyOrders(user.id);
  }

  @Get('seller')
  @UseGuards(RolesGuard)
  @Roles(Role.seller, Role.admin)
  @ApiOperation({ summary: "Seller's OMS — orders containing their items only" })
  getSellerOrders(@CurrentUser() user: Profile) {
    return this.ordersService.getSellerOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail (buyer sees own, seller sees if they have items in it)' })
  getOrderById(@Param('id') id: string, @CurrentUser() user: Profile) {
    return this.ordersService.getOrderById(id, user.id, user.role as Role);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.seller, Role.admin)
  @ApiOperation({ summary: 'Update order status (validates transition table)' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: Profile,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.id, user.role as Role, dto);
  }

  @Post(':id/proof')
  @UseGuards(RolesGuard)
  @Roles(Role.seller, Role.admin)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload handover proof image — returns URL to pass to PUT /orders/:id/status' })
  uploadProof(
    @Param('id') id: string,
    @CurrentUser() user: Profile,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ordersService.uploadProof(id, user.id, user.role as Role, file);
  }
}
