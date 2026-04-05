import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutorial } from './tutorial.entity';
import { SupportTicket } from './support-ticket.entity';
import { TicketMessage } from './ticket-message.entity';
import { FormationService } from './formation.service';
import { FormationController } from './formation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tutorial, SupportTicket, TicketMessage])],
  controllers: [FormationController],
  providers: [FormationService],
  exports: [FormationService],
})
export class FormationModule {}
