import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingController } from './reporting.controller';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { NonConformity } from '../non-conformities/non-conformity.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Article } from '../articles/article.entity';
import { Tool } from '../tools/tool.entity';
import { Personnel } from '../personnel/personnel.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { ProjectFinanceSnapshot } from '../projects/project-finance-snapshot.entity';
import { StockMovement } from '../stock/stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Task,
      NonConformity,
      Invoice,
      Article,
      Tool,
      Personnel,
      Transaction,
      ProjectFinanceSnapshot,
      StockMovement,
    ]),
  ],
  controllers: [ReportingController],
})
export class ReportingModule {}
