import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { TaskPersonnel } from '../tasks/task-personnel.entity';
import { TaskArticle } from '../tasks/task-article.entity';
import { TaskTool } from '../tasks/task-tool.entity';
import { GanttService } from './gantt.service';
import { GanttController } from './gantt.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Task,
      TaskPersonnel,
      TaskArticle,
      TaskTool,
    ]),
  ],
  controllers: [GanttController],
  providers: [GanttService],
})
export class GanttModule {}
