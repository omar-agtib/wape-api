import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CloudinaryService,
  UploadFolder,
} from '../cloudinary/cloudinary.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

const VALID_FOLDERS: UploadFolder[] = [
  'barcodes',
  'invoices',
  'documents',
  'nc-images',
  'nc-plans',
  'contact-documents',
  'avatars',
  'supplier-invoices',
];

@ApiTags('upload')
@ApiBearerAuth('JWT')
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  // ── Single file upload ──────────────────────────────────────────────────────

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a single file to Cloudinary',
    description: `Uploads a file and returns the Cloudinary URL.

**Folders:**
- \`documents\` — project/task documents (PDF, DOCX, XLSX)
- \`nc-images\` — non-conformity photos (JPG, PNG)
- \`nc-plans\` — non-conformity site plans (PDF, image)
- \`contact-documents\` — supplier/client/subcontractor documents
- \`supplier-invoices\` — supplier invoice PDFs
- \`avatars\` — user profile photos
- \`invoices\` — generated WAPE invoice PDFs (internal)
- \`barcodes\` — article barcode images (internal)

**Use the returned \`secureUrl\`** in subsequent API calls (e.g. POST /documents, PATCH /nc/:id/plan).`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 50MB)',
        },
      },
    },
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    enum: VALID_FOLDERS,
    description: 'Target folder in Cloudinary (default: documents)',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        secureUrl:
          'https://res.cloudinary.com/your-cloud/image/upload/v1234/wape/tenant-id/documents/file.pdf',
        publicId: 'wape/tenant-id/documents/file_xyz',
        originalFilename: 'plan-execution.pdf',
        format: 'pdf',
        bytes: 2048576,
        resourceType: 'raw',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'FILE_TOO_LARGE | INVALID_FILE_TYPE | UPLOAD_FAILED',
  })
  async uploadFile(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: UploadFolder = 'documents',
  ) {
    if (!file) {
      throw new BadRequestException({
        error: 'NO_FILE',
        message:
          'No file was provided. Use multipart/form-data with field name "file"',
        field: 'file',
      });
    }

    if (!VALID_FOLDERS.includes(folder)) {
      throw new BadRequestException({
        error: 'INVALID_FOLDER',
        message: `Invalid folder '${folder}'. Valid options: ${VALID_FOLDERS.join(', ')}`,
        field: 'folder',
      });
    }

    // Choose allowed types based on folder
    const allowedTypes = ['nc-images', 'avatars'].includes(folder)
      ? 'image'
      : [
            'documents',
            'nc-plans',
            'contact-documents',
            'supplier-invoices',
            'invoices',
          ].includes(folder)
        ? 'document'
        : 'any';

    const result = await this.cloudinaryService.uploadFile(
      file,
      folder,
      user.tenantId,
      { allowedTypes },
    );

    return {
      secureUrl: result.secureUrl,
      publicId: result.publicId,
      originalFilename: result.originalFilename,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resourceType,
      ...(result.width && { width: result.width }),
      ...(result.height && { height: result.height }),
    };
  }

  // ── Multiple files upload ───────────────────────────────────────────────────

  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({
    summary: 'Upload multiple files at once (max 10)',
    description:
      'Returns an array of upload results in the same order as the files sent.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Files to upload (max 10, 50MB each)',
        },
      },
    },
  })
  @ApiQuery({ name: 'folder', required: false, enum: VALID_FOLDERS })
  async uploadFiles(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: UploadFolder = 'documents',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException({
        error: 'NO_FILES',
        message: 'No files were provided',
        field: 'files',
      });
    }

    const results = await Promise.all(
      files.map((file) =>
        this.cloudinaryService.uploadFile(file, folder, user.tenantId),
      ),
    );

    return results.map((r) => ({
      secureUrl: r.secureUrl,
      publicId: r.publicId,
      originalFilename: r.originalFilename,
      format: r.format,
      bytes: r.bytes,
    }));
  }

  // ── Image upload (NC images, avatars) ───────────────────────────────────────

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload an image file (JPG, PNG, WebP)',
    description:
      'Validates image MIME type. Use for NC photos, site plans, and profile pictures.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    enum: ['nc-images', 'nc-plans', 'avatars'],
  })
  async uploadImage(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: UploadFolder = 'nc-images',
  ) {
    if (!file) {
      throw new BadRequestException({
        error: 'NO_FILE',
        message: 'No file provided',
        field: 'file',
      });
    }

    const result = await this.cloudinaryService.uploadFile(
      file,
      folder,
      user.tenantId,
      { allowedTypes: 'image', maxSizeMb: 10 },
    );

    return {
      secureUrl: result.secureUrl,
      publicId: result.publicId,
      originalFilename: result.originalFilename,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  }
}
