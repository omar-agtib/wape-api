import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tutorial } from './tutorial.entity';
import { SupportTicket } from './support-ticket.entity';
import { TicketMessage } from './ticket-message.entity';
import { CreateTutorialDto } from './dto/create-tutorial.dto';
import { UpdateTutorialDto } from './dto/update-tutorial.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UserRole } from '../../common/enums';
import {
  paginate,
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';

@Injectable()
export class FormationService {
  constructor(
    @InjectRepository(Tutorial)
    private readonly tutorialRepo: Repository<Tutorial>,
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketMessage)
    private readonly messageRepo: Repository<TicketMessage>,
  ) {}

  // ── Tutorials ────────────────────────────────────────────────────────────────

  async createTutorial(
    userId: string,
    dto: CreateTutorialDto,
  ): Promise<Tutorial> {
    const tutorial = this.tutorialRepo.create({
      ...dto,
      createdBy: userId,
      published: dto.published ?? false,
      orderIndex: dto.orderIndex ?? 0,
    });
    return this.tutorialRepo.save(tutorial);
  }

  async findAllTutorials(
    pagination: PaginationDto,
    role: UserRole,
    category?: string,
  ): Promise<PaginatedResult<Tutorial>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.tutorialRepo.createQueryBuilder('t');

    // Non-admins only see published tutorials
    if (role !== UserRole.ADMIN) {
      qb.where('t.published = TRUE');
    }

    if (category) {
      qb.andWhere('t.category ILIKE :cat', { cat: `%${category}%` });
    }

    qb.orderBy('t.category', 'ASC')
      .addOrderBy('t.order_index', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOneTutorial(id: string): Promise<Tutorial> {
    const t = await this.tutorialRepo.findOne({ where: { id } });
    if (!t)
      throw new NotFoundException({
        error: 'TUTORIAL_NOT_FOUND',
        message: `Tutorial '${id}' not found`,
      });
    return t;
  }

  async updateTutorial(id: string, dto: UpdateTutorialDto): Promise<Tutorial> {
    const t = await this.findOneTutorial(id);
    Object.assign(t, dto);
    return this.tutorialRepo.save(t);
  }

  async deleteTutorial(id: string): Promise<void> {
    const t = await this.findOneTutorial(id);
    await this.tutorialRepo.remove(t);
  }

  // ── Support Tickets ──────────────────────────────────────────────────────────

  async createTicket(
    tenantId: string,
    userId: string,
    dto: CreateTicketDto,
  ): Promise<SupportTicket> {
    const ticket = this.ticketRepo.create({
      tenantId,
      userId,
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority ?? 'medium',
      status: 'open',
    });
    return this.ticketRepo.save(ticket);
  }

  async findAllTickets(
    tenantId: string,
    role: UserRole,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<SupportTicket>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.ticketRepo.createQueryBuilder('t');

    // Admins see all tickets, regular users see only their tenant's
    qb.where('t.tenant_id = :tenantId', { tenantId });

    qb.orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOneTicket(tenantId: string, id: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id, tenantId } });
    if (!ticket)
      throw new NotFoundException({
        error: 'TICKET_NOT_FOUND',
        message: `Ticket '${id}' not found`,
      });

    const messages = await this.messageRepo.find({
      where: { ticketId: id },
      order: { sentAt: 'ASC' },
    });

    return { ...ticket, messages };
  }

  async addMessage(
    tenantId: string,
    ticketId: string,
    senderId: string,
    role: UserRole,
    dto: AddMessageDto,
  ): Promise<TicketMessage> {
    await this.findOneTicket(tenantId, ticketId);

    const message = this.messageRepo.create({
      ticketId,
      senderId,
      message: dto.message,
      isSupportAgent: role === UserRole.ADMIN,
      sentAt: new Date(),
    });

    return this.messageRepo.save(message);
  }

  async updateTicketStatus(
    tenantId: string,
    id: string,
    dto: UpdateTicketStatusDto,
  ): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id, tenantId } });
    if (!ticket)
      throw new NotFoundException({
        error: 'TICKET_NOT_FOUND',
        message: `Ticket '${id}' not found`,
      });

    await this.ticketRepo.update(id, { status: dto.status });
    return this.ticketRepo.findOne({ where: { id } }) as Promise<SupportTicket>;
  }
}
