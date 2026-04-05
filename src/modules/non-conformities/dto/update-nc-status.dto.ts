import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { NcStatus } from '../../../common/enums';

export class UpdateNcStatusDto {
  @ApiProperty({
    enum: NcStatus,
    description: 'Valid transitions: open → in_review → closed',
  })
  @IsEnum(NcStatus)
  status: NcStatus;
}
