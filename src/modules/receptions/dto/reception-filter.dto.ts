import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReceptionStatus } from '../../../common/enums';

export class ReceptionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by purchase order' })
  @IsOptional() @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ enum: ReceptionStatus })
  @IsOptional() @IsEnum(ReceptionStatus)
  status?: ReceptionStatus;

  @ApiPropertyOptional({ description: 'Filter by article' })
  @IsOptional() @IsUUID()
  articleId?: string;
}