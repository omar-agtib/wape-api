import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NonConformity } from './non-conformity.entity';
import { NcImage } from './nc-image.entity';
import { Plan } from '../plans/plan.entity';
import { NonConformitiesService } from './non-conformities.service';
import { NonConformitiesController } from './non-conformities.controller';
import { RealtimeModule } from '../../shared/realtime/realtime.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NonConformity, NcImage, Plan]),
    RealtimeModule,
    MailModule,
  ],
  controllers: [NonConformitiesController],
  providers: [NonConformitiesService],
  exports: [NonConformitiesService],
})
export class NonConformitiesModule {}
