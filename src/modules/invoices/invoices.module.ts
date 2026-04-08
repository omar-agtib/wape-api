import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AttachmentsModule } from '../attachments/attachments.module';
import { ContactsModule } from '../contacts/contacts.module';
import { RealtimeModule } from '../../shared/realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    forwardRef(() => AttachmentsModule),
    ContactsModule,
    RealtimeModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
