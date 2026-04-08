import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Article]), CloudinaryModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
