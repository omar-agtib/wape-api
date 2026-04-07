import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reception } from './reception.entity';
import { PurchaseOrderLine } from '../purchase-orders/purchase-order-line.entity';
import { Article } from '../articles/article.entity';
import { ReceptionsService } from './receptions.service';
import { ReceptionsController } from './receptions.controller';
import { StockModule } from '../stock/stock.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reception, PurchaseOrderLine, Article]),
    StockModule,
    forwardRef(() => PurchaseOrdersModule),
  ],
  controllers: [ReceptionsController],
  providers: [ReceptionsService],
  exports: [ReceptionsService],
})
export class ReceptionsModule {}
