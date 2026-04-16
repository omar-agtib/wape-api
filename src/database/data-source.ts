import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

import { Tenant } from '../modules/tenants/tenant.entity';
import { User } from '../modules/users/user.entity';
import { Personnel } from '../modules/personnel/personnel.entity';
import { Project } from '../modules/projects/project.entity';
import { ProjectFinanceSnapshot } from '../modules/projects/project-finance-snapshot.entity';
import { Task } from '../modules/tasks/task.entity';
import { TaskPersonnel } from '../modules/tasks/task-personnel.entity';
import { TaskArticle } from '../modules/tasks/task-article.entity';
import { TaskTool } from '../modules/tasks/task-tool.entity';
import { Tool } from '../modules/tools/tool.entity';
import { ToolMovement } from '../modules/tools/tool-movement.entity';
import { Article } from '../modules/articles/article.entity';
import { StockMovement } from '../modules/stock/stock-movement.entity';
import { Contact } from '../modules/contacts/contact.entity';
import { ContactDocument } from '../modules/contacts/contact-document.entity';
import { PurchaseOrder } from '../modules/purchase-orders/purchase-order.entity';
import { PurchaseOrderLine } from '../modules/purchase-orders/purchase-order-line.entity';
import { Reception } from '../modules/receptions/reception.entity';
import { Attachment } from '../modules/attachments/attachment.entity';
import { AttachmentTask } from '../modules/attachments/attachment-task.entity';
import { Invoice } from '../modules/invoices/invoice.entity';
import { NonConformity } from '../modules/non-conformities/non-conformity.entity';
import { NcImage } from '../modules/non-conformities/nc-image.entity';
import { Document } from '../modules/documents/document.entity';
import { Tutorial } from '../modules/formation/tutorial.entity';
import { SupportTicket } from '../modules/formation/support-ticket.entity';
import { TicketMessage } from '../modules/formation/ticket-message.entity';
import { Subscription } from '../modules/finance/entities/subscription.entity';
import { SupplierPayment } from '../modules/finance/entities/supplier-payment.entity';
import { SubcontractorPayment } from '../modules/finance/entities/subcontractor-payment.entity';
import { Transaction } from '../modules/finance/entities/transaction.entity';
import { Operateur } from '../modules/operateurs/operateur.entity';
import { Pointage } from '../modules/pointages/pointage.entity';
import { Plan } from '../modules/plans/plan.entity';
import { PlanVersion } from '../modules/plans/plan-version.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'my_password123!',
  database: process.env.DB_NAME || 'wape',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
    Operateur,
    Pointage,
    Plan,
    PlanVersion,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
