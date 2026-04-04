import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectFinanceSnapshot } from './project-finance-snapshot.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectFinanceSnapshot]), PurchaseOrdersModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}