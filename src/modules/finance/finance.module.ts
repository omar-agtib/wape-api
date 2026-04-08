import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Subscription } from './entities/subscription.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SubcontractorPayment } from './entities/subcontractor-payment.entity';
import { Transaction } from './entities/transaction.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { ContactsModule } from '../contacts/contacts.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SupplierPayment,
      SubcontractorPayment,
      Transaction,
    ]),
    ScheduleModule.forRoot(),
    ContactsModule,
    MailModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
