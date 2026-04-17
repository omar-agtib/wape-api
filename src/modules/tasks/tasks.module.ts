import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskPersonnel } from './task-personnel.entity';
import { TaskArticle } from './task-article.entity';
import { TaskTool } from './task-tool.entity';
import { Personnel } from '../personnel/personnel.entity';
import { Article } from '../articles/article.entity';
import { Tool } from '../tools/tool.entity';

import { TasksService } from './tasks.service';

import { TasksController } from './tasks.controller';

import { ProjectsModule } from '../projects/projects.module';
import { ArticlesModule } from '../articles/articles.module';
import { ToolsModule } from '../tools/tools.module';
import { StockModule } from '../stock/stock.module';
import { RealtimeModule } from '../../shared/realtime/realtime.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskPersonnel,
      TaskArticle,
      TaskTool,
      Personnel,
      Article,
      Tool,
    ]),
    ProjectsModule,
    ArticlesModule,
    ToolsModule,
    StockModule,
    RealtimeModule,
    MailModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
