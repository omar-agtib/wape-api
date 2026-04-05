import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { Invoice } from './invoice.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('invoices')
@ApiBearerAuth('JWT')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices (paginated + filters)' })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: InvoiceFilterDto) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail' })
  @ApiResponse({ status: 200, type: Invoice })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Invoice> {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id/validate')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Validate invoice — triggers W8',
    description: `Transitions: \`pending_validation\` → \`validated\`.

**Workflow W8:** PDF generation is queued asynchronously (BullMQ — Sprint 5).
For now \`pdfUrl\` is set to a placeholder and will be replaced when the queue worker runs.

RG19 — invoice status is one-way. No regression allowed.`,
  })
  @ApiResponse({ status: 200, type: Invoice })
  @ApiResponse({ status: 422, description: 'INVOICE_STATUS_REGRESSION (RG19)' })
  validate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Invoice> {
    return this.service.validate(user.tenantId, id);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Mark invoice as paid',
    description:
      'Transitions: `validated` → `paid`. Terminal state — no further transitions (RG19).',
  })
  @ApiResponse({ status: 200, type: Invoice })
  @ApiResponse({ status: 422, description: 'INVOICE_STATUS_REGRESSION (RG19)' })
  markPaid(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Invoice> {
    return this.service.markPaid(user.tenantId, id);
  }

  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Get PDF download URL',
    description:
      'Returns the pdfUrl (S3 signed URL in Sprint 5). Invoice must be validated first.',
  })
  async getPdf(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const invoice = await this.service.findOne(user.tenantId, id);
    if (!invoice.pdfUrl) {
      return {
        pdfUrl: null,
        message: 'PDF not yet generated. Validate the invoice first.',
      };
    }
    return { pdfUrl: invoice.pdfUrl, invoiceNumber: invoice.invoiceNumber };
  }
}
