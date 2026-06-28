import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { validate } from './config/env.config';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PayoutsModule } from './payouts/payouts.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ShopsModule } from './shops/shops.module';
import { StorageModule } from './storage/storage.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    StorageModule,
    AuthModule,
    ProductsModule,
    ShopsModule,
    CartModule,
    OrdersModule,
    PayoutsModule,
    NotificationsModule,
    AdminModule,
    WishlistModule,
    ReviewsModule,
  ],
  controllers: [HealthController],
  providers: [JwtStrategy],
})
export class AppModule {}
