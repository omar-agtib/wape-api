import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
// TENANT_ID        = a52178c8-9a68-4e3b-b7f4-05e279a1f1a3
// USER_ID          = d797a1db-7851-4a1f-8615-3b7dd9982a58
// ACCESS_TOKEN     = ________________________________

// SUPPLIER_ID      = 6e73a61c-d751-438c-a125-33d809e6f781
// CLIENT_ID        = de2a33e4-b8d5-4e76-8464-d400f94e8799
// SUBCONTRACTOR_ID = a821bd59-7c08-45d4-91f5-72764c1d1760

// PERSONNEL_ID     = 40d91919-afaf-4741-8262-90d0e500f721
// TOOL_ID          = be1de2d7-fe8b-4e29-bdff-695d824d2c0e
// ARTICLE_ID       = ced17332-6356-4b22-88d9-eb00957ae86f

// PROJECT_ID       = 3f0f4485-a7b5-4387-a61c-501a26836908
// TASK_ID          = 53156154-f88c-4843-9b32-6c79aa97977c

// TASK_PERSONNEL_ID = 75e9ed05-e052-43f8-9913-516b8df46596
// TASK_ARTICLE_ID  = e5818037-5805-40b1-b8a3-9d002d1d6a53
// TASK_TOOL_ID     = 24bf9537-2c4e-4629-aab9-fbdf1a2e1a99

// PO_ID            = 0d555765-3a68-44f4-b51a-f7362fb919a2
// PO_LINE_ID       = 7e7db62c-e7f0-4033-b361-0b593d03004c
// RECEPTION_ID_1   = fc851013-fb41-408d-a82a-83ae33dcecde
// RECEPTION_ID_2   = 4da8252a-ca75-41c3-bac6-02e67e5b2719

// NEW_TASK_ID        = b2399d9e-4824-4440-acdd-494b8707d485

// ATTACHMENT_ID    = d00b0257-ee10-4f61-ba58-5afe1a6087d2
// INVOICE_ID       = dbf3157c-4be4-437b-a924-fe1d0dea805e

// NC_ID            = c59e021b-0d82-4a08-812e-ef2d9a7948af
// NC_IMAGE_ID      = baa64e2d-0902-4051-b3ee-f8774c3f93f4
// DOCUMENT_ID      = 5726111e-8d2c-47d7-8a43-8fcc2576aa5f
// TICKET_ID        = 74f64628-8bf3-4472-a74a-2f9b18f30e83

// SUB_PAYMENT_ID   = e31ec8e9-b90f-4e58-ac39-c3f8b1b4ba53
// SP_PAYMENT_ID    = d0f2f9bf-de13-433b-83a2-cd406b655b7a
// TRANSACTION_ID_1 = STRIPE-PI-3NkJ8KLnJh7z4
// TRANSACTION_ID_2 = ________________________________
