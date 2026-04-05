import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

export class CreateAttachmentDto {
  @ApiProperty({ example: 'uuid-of-project' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    example: 'uuid-of-subcontractor-contact',
    description:
      'If NULL → internal attachment (no invoice created). If set → external (invoice auto-created on confirm).',
  })
  @IsOptional()
  @IsUUID()
  subcontractorId?: string;

  @ApiProperty({ example: 'Attachement Gros Œuvre Bloc A — Avril 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES)
  currency: string;

  @ApiProperty({
    type: [String],
    example: ['uuid-task-1', 'uuid-task-2'],
    description:
      'All tasks MUST have status=completed (RG03). A task cannot appear in two confirmed attachments (RG18).',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];
}
