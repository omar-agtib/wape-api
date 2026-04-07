import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ContactType } from '../../../common/enums';

export class ContactFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ContactType })
  @IsOptional()
  @IsEnum(ContactType)
  contactType?: ContactType;

  @ApiPropertyOptional({ description: 'Search by legal name, email' })
  @IsOptional()
  @IsString()
  search?: string;
}
