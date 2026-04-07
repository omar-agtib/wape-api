import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../../common/enums';

export class ChangeTaskStatusDto {
  @ApiProperty({
    enum: TaskStatus,
    description:
      'Valid transitions: planned → on_progress → completed. No regression allowed.',
  })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
