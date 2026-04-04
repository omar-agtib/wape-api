import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import { AddContactDocumentDto } from './dto/add-document.dto';
import { Contact } from './contact.entity';
import { ContactDocument } from './contact-document.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ContactType } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('contacts')
@ApiBearerAuth('JWT')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({
    summary: 'Create a contact (supplier / client / subcontractor)',
    description: '`contactType` is **immutable** after creation (RG17). Cannot change supplier → client etc.',
  })
  @ApiResponse({ status: 201, type: Contact })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateContactDto): Promise<Contact> {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contacts (paginated + filter by type)' })
  @ApiQuery({ name: 'contactType', required: false, enum: ContactType })
  @ApiQuery({ name: 'search', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: ContactFilterDto) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact detail with documents' })
  @ApiResponse({ status: 200 })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({
    summary: 'Update contact — contactType excluded (RG17 immutable)',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ): Promise<Contact> {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete contact' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Contact deleted successfully' };
  }

  @Post(':id/documents')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({
    summary: 'Attach a document to a contact',
    description: 'In Sprint 5, this will also auto-insert into the central documents repository (W9 trigger).',
  })
  @ApiResponse({ status: 201, type: ContactDocument })
  addDocument(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddContactDocumentDto,
  ): Promise<ContactDocument> {
    return this.service.addDocument(user.tenantId, id, dto, user.sub);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List documents attached to a contact' })
  listDocuments(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ContactDocument[]> {
    return this.service.listDocuments(user.tenantId, id);
  }
}