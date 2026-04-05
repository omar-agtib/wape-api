import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './attachment.entity';
import { AttachmentTask } from './attachment-task.entity';
import { ProjectFinanceSnapshot } from '../projects/project-finance-snapshot.entity';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { ContactsModule } from '../contacts/contacts.module';
import { TasksModule } from '../tasks/tasks.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attachment,
      AttachmentTask,
      ProjectFinanceSnapshot,
    ]),
    ContactsModule,
    TasksModule,
    forwardRef(() => InvoicesModule),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
