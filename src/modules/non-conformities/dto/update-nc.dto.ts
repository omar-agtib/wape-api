import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateNcDto } from './create-nc.dto';

export class UpdateNcDto extends PartialType(
  OmitType(CreateNcDto, ['projectId'] as const),
) {}
