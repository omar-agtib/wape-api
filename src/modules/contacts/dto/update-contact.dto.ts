import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateContactDto } from './create-contact.dto';

// contactType is IMMUTABLE after creation (RG17) — excluded from updates
export class UpdateContactDto extends PartialType(
  OmitType(CreateContactDto, ['contactType'] as const),
) {}