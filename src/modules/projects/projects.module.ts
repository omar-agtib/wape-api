import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectFinanceSnapshot } from './project-finance-snapshot.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { RealtimeModule } from '../../shared/realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectFinanceSnapshot]),
    RealtimeModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
