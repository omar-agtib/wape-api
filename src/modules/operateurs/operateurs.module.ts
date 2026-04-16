import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operateur } from './operateur.entity';
import { OperateursService } from './operateurs.service';
import { OperateursController } from './operateurs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Operateur])],
  controllers: [OperateursController],
  providers: [OperateursService],
  exports: [OperateursService],
})
export class OperateursModule {}
