import {
  Controller,
  Get,
  Post,
  Delete,
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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';
import { Document } from './document.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('documents')
@ApiBearerAuth('JWT')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @RequirePermission('documents', 'C')
  @ApiOperation({
    summary: 'Add a document to the central repository (W4)',
    description: `This is the **central document repository** — all documents across all modules land here.
Pass the S3 URL after uploading directly to S3 from the frontend.
\`sourceType\` + \`sourceId\` links the document to its parent entity (project, task, contact, NC, etc.).`,
  })
  @ApiResponse({ status: 201, type: Document })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDocumentDto,
  ): Promise<Document> {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @RequirePermission('documents', 'R')
  @ApiOperation({
    summary: 'Search documents (paginated)',
    description:
      'Filter by `sourceType`, `sourceId`, `fileType`, or search by name. All documents for your tenant.',
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filters: DocumentFilterDto,
  ) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @RequirePermission('documents', 'R')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, type: Document })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Document> {
    return this.service.findOne(user.tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('documents', 'D')
  @ApiOperation({ summary: 'Soft delete a document' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Document deleted successfully' };
  }
}
