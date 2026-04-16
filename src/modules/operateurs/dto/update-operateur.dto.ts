import { PartialType } from '@nestjs/swagger';
import { CreateOperateurDto } from './create-operateur.dto';

export class UpdateOperateurDto extends PartialType(CreateOperateurDto) {}
