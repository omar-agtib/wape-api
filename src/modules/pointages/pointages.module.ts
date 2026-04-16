import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pointage } from './pointage.entity';
import { Operateur } from '../operateurs/operateur.entity';
import { PointagesService } from './pointages.service';
import { PointagesController } from './pointages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pointage, Operateur])],
  controllers: [PointagesController],
  providers: [PointagesService],
  exports: [PointagesService],
})
export class PointagesModule {}
