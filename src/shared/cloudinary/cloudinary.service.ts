import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CLOUDINARY } from './cloudinary.provider';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
  UploadApiOptions,
} from 'cloudinary';
import { createReadStream } from 'streamifier';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  originalFilename: string;
}

export type UploadFolder =
  | 'barcodes'
  | 'invoices'
  | 'documents'
  | 'nc-images'
  | 'nc-plans'
  | 'contact-documents'
  | 'avatars'
  | 'supplier-invoices';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  any: [],
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinaryInstance: typeof cloudinary,
  ) {}

  // ── Core upload ─────────────────────────────────────────────────────────────

  async uploadFile(
    file: Express.Multer.File,
    folder: UploadFolder,
    tenantId: string,
    options?: {
      allowedTypes?: 'image' | 'document' | 'any';
      maxSizeMb?: number;
      transformation?: object[];
    },
  ): Promise<CloudinaryUploadResult> {
    // Validate file size
    const maxSize = (options?.maxSizeMb ?? 50) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException({
        error: 'FILE_TOO_LARGE',
        message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the ${options?.maxSizeMb ?? 50}MB limit`,
        field: 'file',
      });
    }

    // Validate MIME type
    const allowedTypes = options?.allowedTypes ?? 'any';
    if (allowedTypes !== 'any') {
      const allowed = ALLOWED_MIME_TYPES[allowedTypes];
      if (!allowed.includes(file.mimetype)) {
        throw new BadRequestException({
          error: 'INVALID_FILE_TYPE',
          message: `File type '${file.mimetype}' is not allowed for this upload`,
          field: 'file',
          details: { allowed, received: file.mimetype },
        });
      }
    }

    // Build Cloudinary folder path: wape/{tenantId}/{folder}
    const cloudFolder = `wape/${tenantId}/${folder}`;

    try {
      const result = await this.uploadStream(file.buffer, {
        folder: cloudFolder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...(options?.transformation && {
          transformation: options.transformation,
        }),
      });

      this.logger.log(
        `Uploaded ${file.originalname} → ${result.secure_url} (${(file.size / 1024).toFixed(1)}KB)`,
      );

      return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        originalFilename: file.originalname,
      };
    } catch (err) {
      this.logger.error(`Cloudinary upload failed: ${(err as Error).message}`);
      throw new BadRequestException({
        error: 'UPLOAD_FAILED',
        message: 'File upload failed. Please try again.',
        details: { reason: (err as Error).message },
      });
    }
  }

  // ── Delete file ─────────────────────────────────────────────────────────────

  async deleteFile(publicId: string): Promise<void> {
    try {
      await this.cloudinaryInstance.uploader.destroy(publicId);
      this.logger.log(`Deleted Cloudinary asset: ${publicId}`);
    } catch (err) {
      this.logger.warn(
        `Failed to delete Cloudinary asset ${publicId}: ${(err as Error).message}`,
      );
    }
  }

  // ── Upload PNG buffer (for generated barcodes) ──────────────────────────────

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    folder: UploadFolder,
    tenantId: string,
  ): Promise<CloudinaryUploadResult> {
    const cloudFolder = `wape/${tenantId}/${folder}`;

    const result = await this.uploadStream(buffer, {
      folder: cloudFolder,
      public_id: filename,
      resource_type: 'image',
      format: 'png',
      overwrite: true,
    });

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      originalFilename: filename,
    };
  }

  // ── Private: stream upload ───────────────────────────────────────────────────

  private uploadStream(
    buffer: Buffer,
    options: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinaryInstance.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) return reject(new Error(error.message));
          if (!result) return reject(new Error('No result from Cloudinary'));
          resolve(result);
        },
      );
      createReadStream(buffer).pipe(uploadStream);
    });
  }
}
