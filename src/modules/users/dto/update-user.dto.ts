import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Fatima Zahra' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Deactivate or reactivate user access' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
