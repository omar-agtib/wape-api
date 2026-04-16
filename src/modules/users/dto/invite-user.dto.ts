import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums';

export class InviteUserDto {
  @ApiProperty({ example: 'Fatima Zahra' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'fz@acme.ma' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PROJECT_MANAGER })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 'Temp@2026!',
    description: 'Temporary password — user should change on first login',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
