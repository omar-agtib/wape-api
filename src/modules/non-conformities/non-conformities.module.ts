import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NonConformity } from './non-conformity.entity';
import { NcImage } from './nc-image.entity';
import { NonConformitiesService } from './non-conformities.service';
import { NonConformitiesController } from './non-conformities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NonConformity, NcImage])],
  controllers: [NonConformitiesController],
  providers: [NonConformitiesService],
  exports: [NonConformitiesService],
})
export class NonConformitiesModule {}
