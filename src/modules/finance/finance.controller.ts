import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { PaySupplierDto } from './dto/pay-supplier.dto';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { PaySubcontractorDto } from './dto/pay-subcontractor.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { ValidateTransactionDto } from './dto/validate-transaction.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaymentStatus, UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { WebhookDto } from './dto/webhook.dto';

@ApiTags('finance')
@ApiBearerAuth('JWT')
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('finance', 'R')
  @ApiOperation({
    summary: 'Finance dashboard — KPIs, monthly chart, subscription status',
    description: `Returns:
- **KPIs**: total payments this month, by type, pending amounts, overdue count
- **monthlyChart**: last 6 months of successful payments
- **subscription**: current plan, status, next billing date`,
  })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.service.getDashboard(user.tenantId);
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  @Get('subscriptions')
  @RequirePermission('finance', 'R')
  @ApiOperation({ summary: 'Get current tenant subscription' })
  getSubscription(@CurrentUser() user: JwtPayload) {
    return this.service.getSubscription(user.tenantId);
  }

  @Post('subscriptions')
  @RequirePermission('subscriptions', 'C')
  @ApiOperation({
    summary: 'Create / activate a subscription (admin only)',
    description:
      'One active subscription per tenant (RG-P02). Status starts as `pending` until payment is confirmed.',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 409,
    description: 'SUBSCRIPTION_ALREADY_ACTIVE (RG-P02)',
  })
  createSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.service.createSubscription(user.tenantId, dto);
  }

  @Post('subscriptions/webhook')
  @RequirePermission('subscriptions', 'U')
  @ApiOperation({
    summary: 'Payment gateway webhook — W11',
    description: `Simulates a successful payment callback from Stripe/PayPal/CMI.

In production, verify the HMAC signature before processing (RG-P07).
Webhooks without a valid signature should be silently rejected with HTTP 200.

This endpoint:
1. Creates an immutable transaction record (status=success)
2. Updates subscription status → active
3. Recalculates nextBillingDate
4. Clears accessRestricted flag if it was set`,
  })
  @ApiResponse({ status: 201 })
  processWebhook(@CurrentUser() user: JwtPayload, @Body() dto: WebhookDto) {
    return this.service.processWebhook(
      user.tenantId,
      dto.transactionId,
      dto.gatewayResponse ?? {},
    );
  }

  // ── Supplier Payments ──────────────────────────────────────────────────────

  @Post('supplier-payments')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a supplier payment entry' })
  @ApiResponse({ status: 201 })
  createSupplierPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupplierPaymentDto,
  ) {
    return this.service.createSupplierPayment(user.tenantId, dto);
  }

  @Get('supplier-payments')
  @RequirePermission('finance', 'R')
  @ApiOperation({ summary: 'List supplier payments (paginated + filters)' })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  findAllSupplierPayments(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
    @Query('supplierId') supplierId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.service.findAllSupplierPayments(user.tenantId, pagination, {
      supplierId,
      projectId,
      status,
    });
  }

  @Post('supplier-payments/:id/pay')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Record a supplier payment — W13',
    description: `**Workflow W13:**
1. Validates amount <= remaining (RG-P01)
2. Validates total does not exceed invoice amount (RG-P05)
3. Creates immutable transaction record
4. Updates amountPaid, remainingAmount, status`,
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 422,
    description:
      'AMOUNT_EXCEEDS_REMAINING (RG-P01) | AMOUNT_EXCEEDS_INVOICE (RG-P05)',
  })
  paySupplier(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PaySupplierDto,
  ) {
    return this.service.paySupplier(user.tenantId, id, dto);
  }

  @Patch('supplier-payments/:id/upload-invoice')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Attach a supplier invoice PDF URL (from Cloudinary)',
  })
  uploadSupplierInvoice(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { fileUrl: string },
  ) {
    return this.service.uploadSupplierInvoice(user.tenantId, id, body.fileUrl);
  }

  // ── Subcontractor Payments ─────────────────────────────────────────────────

  @Post('subcontractor-payments')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a subcontractor payment entry' })
  @ApiResponse({ status: 201 })
  createSubcontractorPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubcontractorPaymentDto,
  ) {
    return this.service.createSubcontractorPayment(user.tenantId, dto);
  }

  @Get('subcontractor-payments')
  @RequirePermission('finance', 'R')
  @ApiOperation({
    summary: 'List subcontractor payments (paginated + filters)',
  })
  @ApiQuery({ name: 'subcontractorId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  findAllSubcontractorPayments(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
    @Query('subcontractorId') subcontractorId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.service.findAllSubcontractorPayments(
      user.tenantId,
      pagination,
      {
        subcontractorId,
        projectId,
        status,
      },
    );
  }

  @Post('subcontractor-payments/:id/pay')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Record a subcontractor payment (partial or full)',
    description:
      'Amount must be <= remaining (RG-P01). Creates immutable transaction record.',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 422,
    description: 'AMOUNT_EXCEEDS_REMAINING (RG-P01)',
  })
  paySubcontractor(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PaySubcontractorDto,
  ) {
    return this.service.paySubcontractor(user.tenantId, id, dto);
  }

  // ── Transactions ───────────────────────────────────────────────────────────

  @Get('transactions')
  @RequirePermission('finance', 'R')
  @ApiOperation({
    summary: 'Central transaction ledger — immutable audit log (RG-P03)',
    description:
      'Date range is limited to 12 months per request (RG-P08). Transactions are never modified or deleted.',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 422, description: 'DATE_RANGE_TOO_LARGE (RG-P08)' })
  findAllTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() filters: TransactionFilterDto,
  ) {
    return this.service.findAllTransactions(user.tenantId, filters);
  }

  @Patch('transactions/:id/validate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Validate a pending bank transfer — W12',
    description: `**Admin / Accountant only (RG-P04)**

Used for bank transfer payments that require manual confirmation.
1. User uploads bank receipt
2. Admin/Accountant reviews and validates
3. Transaction marked as success
4. Subscription activated if applicable`,
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 403,
    description: 'INSUFFICIENT_PERMISSIONS (RG-P04)',
  })
  validateBankTransfer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ValidateTransactionDto,
  ) {
    return this.service.validateBankTransfer(user.tenantId, id, dto, user.role);
  }
}
