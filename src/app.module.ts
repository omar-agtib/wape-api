import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { HealthModule } from './modules/health/health.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ToolsModule } from './modules/tools/tools.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { StockModule } from './modules/stock/stock.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ReceptionsModule } from './modules/receptions/receptions.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { NonConformitiesModule } from './modules/non-conformities/non-conformities.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { GanttModule } from './modules/gantt/gantt.module';
import { FormationModule } from './modules/formation/formation.module';
import { FinanceModule } from './modules/finance/finance.module';

import { Tenant } from './modules/tenants/tenant.entity';
import { User } from './modules/users/user.entity';
import { Personnel } from './modules/personnel/personnel.entity';
import { Project } from './modules/projects/project.entity';
import { ProjectFinanceSnapshot } from './modules/projects/project-finance-snapshot.entity';
import { Task } from './modules/tasks/task.entity';
import { TaskPersonnel } from './modules/tasks/task-personnel.entity';
import { TaskArticle } from './modules/tasks/task-article.entity';
import { TaskTool } from './modules/tasks/task-tool.entity';
import { Tool } from './modules/tools/tool.entity';
import { ToolMovement } from './modules/tools/tool-movement.entity';
import { Article } from './modules/articles/article.entity';
import { StockMovement } from './modules/stock/stock-movement.entity';
import { Contact } from './modules/contacts/contact.entity';
import { ContactDocument } from './modules/contacts/contact-document.entity';
import { PurchaseOrder } from './modules/purchase-orders/purchase-order.entity';
import { PurchaseOrderLine } from './modules/purchase-orders/purchase-order-line.entity';
import { Reception } from './modules/receptions/reception.entity';
import { Attachment } from './modules/attachments/attachment.entity';
import { AttachmentTask } from './modules/attachments/attachment-task.entity';
import { Invoice } from './modules/invoices/invoice.entity';
import { NonConformity } from './modules/non-conformities/non-conformity.entity';
import { NcImage } from './modules/non-conformities/nc-image.entity';
import { Document } from './modules/documents/document.entity';
import { Tutorial } from './modules/formation/tutorial.entity';
import { SupportTicket } from './modules/formation/support-ticket.entity';
import { TicketMessage } from './modules/formation/ticket-message.entity';
import { Subscription } from './modules/finance/entities/subscription.entity';
import { SupplierPayment } from './modules/finance/entities/supplier-payment.entity';
import { SubcontractorPayment } from './modules/finance/entities/subcontractor-payment.entity';
import { Transaction } from './modules/finance/entities/transaction.entity';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        ssl: config.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
        entities: [
          Tenant,
          User,
          Personnel,
          Project,
          ProjectFinanceSnapshot,
          Task,
          TaskPersonnel,
          TaskArticle,
          TaskTool,
          Tool,
          ToolMovement,
          Article,
          StockMovement,
          Contact,
          ContactDocument,
          PurchaseOrder,
          PurchaseOrderLine,
          Reception,
          Attachment,
          AttachmentTask,
          Invoice,
          NonConformity,
          NcImage,
          Document,
          Tutorial,
          SupportTicket,
          TicketMessage,
          Subscription,
          SupplierPayment,
          SubcontractorPayment,
          Transaction,
        ],
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') ?? 60000,
          limit: config.get<number>('THROTTLE_LIMIT') ?? 100,
        },
      ],
    }),

    AuthModule,
    UsersModule,
    TenantsModule,
    HealthModule,
    PersonnelModule,
    ProjectsModule,
    TasksModule,
    ToolsModule,
    ArticlesModule,
    StockModule,
    ContactsModule,
    PurchaseOrdersModule,
    ReceptionsModule,
    AttachmentsModule,
    InvoicesModule,
    NonConformitiesModule,
    DocumentsModule,
    GanttModule,
    FormationModule,
    FinanceModule,
  ],

  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
