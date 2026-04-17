import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { FormationService } from './formation.service';
import { CreateTutorialDto } from './dto/create-tutorial.dto';
import { UpdateTutorialDto } from './dto/update-tutorial.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { Tutorial } from './tutorial.entity';
import { SupportTicket } from './support-ticket.entity';
import { TicketMessage } from './ticket-message.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('formation')
@ApiBearerAuth('JWT')
@Controller()
export class FormationController {
  constructor(private readonly service: FormationService) {}

  // ── Tutorials ─────────────────────────────────────────────────────────────

  @Post('tutorials')
  @RequirePermission('formation_support', 'C')
  @ApiOperation({ summary: 'Create a tutorial (admin only)' })
  @ApiResponse({ status: 201, type: Tutorial })
  createTutorial(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTutorialDto,
  ): Promise<Tutorial> {
    return this.service.createTutorial(user.sub, dto);
  }

  @Get('tutorials')
  @RequirePermission('formation_support', 'R')
  @ApiOperation({
    summary: 'List tutorials',
    description:
      'Admins see all tutorials. Other roles see only published ones.',
  })
  @ApiQuery({ name: 'category', required: false })
  findAllTutorials(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
    @Query('category') category?: string,
  ) {
    return this.service.findAllTutorials(pagination, user.role, category);
  }

  @Get('tutorials/:id')
  @RequirePermission('formation_support', 'R')
  @ApiOperation({ summary: 'Get tutorial detail' })
  @ApiResponse({ status: 200, type: Tutorial })
  findOneTutorial(@Param('id') id: string): Promise<Tutorial> {
    return this.service.findOneTutorial(id);
  }

  @Put('tutorials/:id')
  @RequirePermission('formation_support', 'U')
  @ApiOperation({ summary: 'Update tutorial (admin only)' })
  updateTutorial(
    @Param('id') id: string,
    @Body() dto: UpdateTutorialDto,
  ): Promise<Tutorial> {
    return this.service.updateTutorial(id, dto);
  }

  @Delete('tutorials/:id')
  @RequirePermission('formation_support', 'D')
  @ApiOperation({ summary: 'Delete tutorial (admin only)' })
  async deleteTutorial(@Param('id') id: string): Promise<{ message: string }> {
    await this.service.deleteTutorial(id);
    return { message: 'Tutorial deleted' };
  }

  // ── Support Tickets ───────────────────────────────────────────────────────

  @Post('support/tickets')
  @RequirePermission('formation_support', 'C')
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, type: SupportTicket })
  createTicket(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTicketDto,
  ): Promise<SupportTicket> {
    return this.service.createTicket(user.tenantId, user.sub, dto);
  }

  @Get('support/tickets')
  @RequirePermission('formation_support', 'R')
  @ApiOperation({ summary: 'List support tickets for your tenant' })
  findAllTickets(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.findAllTickets(user.tenantId, user.role, pagination);
  }

  @Get('support/tickets/:id')
  @RequirePermission('formation_support', 'R')
  @ApiOperation({ summary: 'Get ticket detail with all messages' })
  findOneTicket(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOneTicket(user.tenantId, id);
  }

  @Post('support/tickets/:id/messages')
  @RequirePermission('formation_support', 'C')
  @ApiOperation({
    summary: 'Add a message to a ticket',
    description: 'Admin messages are flagged as `isSupportAgent: true`.',
  })
  @ApiResponse({ status: 201, type: TicketMessage })
  addMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
  ): Promise<TicketMessage> {
    return this.service.addMessage(user.tenantId, id, user.sub, user.role, dto);
  }

  @Patch('support/tickets/:id/status')
  @RequirePermission('formation_support', 'U')
  @ApiOperation({ summary: 'Update ticket status (admin only)' })
  updateTicketStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<SupportTicket> {
    return this.service.updateTicketStatus(user.tenantId, id, dto);
  }
}
