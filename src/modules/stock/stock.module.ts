import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './stock-movement.entity';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { ArticlesModule } from '../articles/articles.module';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement]), ArticlesModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
