import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { ContactsModule } from '../contacts/contacts.module';
import { ArticlesModule } from '../articles/articles.module';
import { ReceptionsModule } from '../receptions/receptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderLine]),
    ContactsModule,
    ArticlesModule,
    forwardRef(() => ReceptionsModule),
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
