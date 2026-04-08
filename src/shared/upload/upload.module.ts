import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadController } from './upload.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    MulterModule.register({
      storage: memoryStorage(), // Keep file in memory — stream to Cloudinary
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB hard cap
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
