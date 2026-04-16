import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePointageDto } from './create-pointage.dto';

export class UpdatePointageDto extends PartialType(
  OmitType(CreatePointageDto, [
    'operateurId',
    'projetId',
    'datePointage',
  ] as const),
) {}
