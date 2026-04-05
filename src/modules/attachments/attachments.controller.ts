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
} from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { ConfirmAttachmentDto } from './dto/confirm-attachment.dto';
import { AttachmentFilterDto } from './dto/attachment-filter.dto';
import { Attachment } from './attachment.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('attachments')
@ApiBearerAuth('JWT')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({
    summary: 'Create an attachment (draft)',
    description: `All tasks must be **completed** (RG03) and not already in a confirmed attachment (RG18).
If \`subcontractorId\` is provided → **external** (invoice auto-created on confirm).
If \`subcontractorId\` is null → **internal** (no invoice, just finance update).`,
  })
  @ApiResponse({ status: 201, type: Attachment })
  @ApiResponse({
    status: 422,
    description:
      'TASK_NOT_COMPLETED (RG03) | TASK_ALREADY_ATTACHED (RG18) | INVALID_SUBCONTRACTOR_TYPE',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAttachmentDto,
  ): Promise<Attachment> {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List attachments (paginated + filters)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filters: AttachmentFilterDto,
  ) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment detail with task IDs' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({
    summary: 'Confirm attachment — triggers W7',
    description: `**Workflow W7 (full transaction):**
1. Calculates costs from tasks (or uses provided overrides)
2. Updates attachment status → \`confirmed\` or \`invoiced\`
3. Updates \`project_finance_snapshot\` (total_spent, remaining_budget, breakdown)
4. If **external** (subcontractor set): auto-creates invoice (\`pending_validation\`)
5. If **internal** (no subcontractor): status stays \`confirmed\`, no invoice

Any failure rolls back the entire transaction.`,
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 422, description: 'ATTACHMENT_NOT_DRAFT' })
  confirm(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ConfirmAttachmentDto,
  ) {
    return this.service.confirm(user.tenantId, id, user.sub, dto);
  }
}
