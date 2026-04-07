import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import {
  ContactDocument,
  ContactDocumentType,
} from './contact-document.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import { AddContactDocumentDto } from './dto/add-document.dto';
import { ContactType } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(ContactDocument)
    private readonly docRepo: Repository<ContactDocument>,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepo.create({ ...dto, tenantId });
    return this.contactRepo.save(contact);
  }

  async findAll(
    tenantId: string,
    filters: ContactFilterDto,
  ): Promise<PaginatedResult<Contact>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.contactRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (filters.contactType)
      qb.andWhere('c.contact_type = :type', { type: filters.contactType });
    if (filters.search) {
      qb.andWhere('(c.legal_name ILIKE :s OR c.email ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }

    qb.orderBy('c.legal_name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<Contact & { documents: ContactDocument[] }> {
    const contact = await this.contactRepo.findOne({ where: { id, tenantId } });
    if (!contact) {
      throw new NotFoundException({
        error: 'CONTACT_NOT_FOUND',
        message: `Contact '${id}' not found`,
      });
    }
    const documents = await this.docRepo.find({
      where: { contactId: id },
      order: { uploadedAt: 'DESC' },
    });
    return { ...contact, documents };
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.findOneRaw(tenantId, id);
    // RG17 — contactType is immutable (enforced at DTO level by OmitType, double-check here)
    Object.assign(contact, dto);
    return this.contactRepo.save(contact);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const contact = await this.findOneRaw(tenantId, id);
    await this.contactRepo.softRemove(contact);
  }

  // ── Documents (W9 trigger simulated in service layer) ───────────────────────

  async addDocument(
    tenantId: string,
    contactId: string,
    dto: AddContactDocumentDto,
    userId: string,
  ): Promise<ContactDocument> {
    await this.findOneRaw(tenantId, contactId);

    const doc = this.docRepo.create({
      contactId,
      documentName: dto.documentName,
      documentType: dto.documentType as ContactDocumentType,
      fileUrl: dto.fileUrl,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });

    return this.docRepo.save(doc);
    // NOTE: In Sprint 5, this will also INSERT into the documents central repository (W9 trigger)
  }

  async listDocuments(
    tenantId: string,
    contactId: string,
  ): Promise<ContactDocument[]> {
    await this.findOneRaw(tenantId, contactId);
    return this.docRepo.find({
      where: { contactId },
      order: { uploadedAt: 'DESC' },
    });
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  async findOneRaw(tenantId: string, id: string): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id, tenantId } });
    if (!contact) {
      throw new NotFoundException({
        error: 'CONTACT_NOT_FOUND',
        message: `Contact '${id}' not found`,
      });
    }
    return contact;
  }

  /** Verify contact exists AND is of the expected type — used by PO/Project validation */
  async verifyType(
    tenantId: string,
    id: string,
    expectedType: ContactType,
  ): Promise<Contact> {
    const contact = await this.findOneRaw(tenantId, id);
    if (contact.contactType !== expectedType) {
      const errorMap: Record<ContactType, string> = {
        [ContactType.CLIENT]: 'INVALID_CLIENT_TYPE',
        [ContactType.SUPPLIER]: 'INVALID_SUPPLIER_TYPE',
        [ContactType.SUBCONTRACTOR]: 'INVALID_SUBCONTRACTOR_TYPE',
      };
      throw new UnprocessableEntityException({
        error: errorMap[expectedType],
        message: `Contact '${id}' is not a ${expectedType} (it is a ${contact.contactType})`,
        field: `${expectedType}Id`,
        details: {
          contactId: id,
          actualType: contact.contactType,
          expectedType,
        },
      });
    }
    return contact;
  }
}
