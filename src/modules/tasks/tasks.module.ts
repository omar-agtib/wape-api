import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskPersonnel } from './task-personnel.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PersonnelModule } from '../personnel/personnel.module';
import { ProjectsModule } from '../projects/projects.module';
import { Personnel } from '../personnel/personnel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskPersonnel, Personnel]),
    ProjectsModule,
    PersonnelModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}