import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ClientsModule } from './clients/clients.module';

import { SalesModule } from './sales/sales.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ProductsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    BrandsModule,
    SuppliersModule,
    PurchasesModule,
    ClientsModule,
    SalesModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
