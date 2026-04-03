import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums';

export class RegisterDto {
  @ApiProperty({ example: 'ACME Construction' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName: string;

  @ApiProperty({
    example: 'acme-construction',
    description: 'Lowercase, hyphens only',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'Ahmed Alami' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ example: 'ahmed@acme.ma' })
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @ApiProperty({
    example: 'Wape@2026!',
    description: 'Min 8 chars, upper + lower + number + special',
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/,
    {
      message: 'Password too weak',
    },
  )
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'acme-construction' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'ahmed@acme.ma' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Wape@2026!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthTokensDto {
  @ApiProperty({ description: 'JWT access token — valid 15 minutes' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token — valid 7 days' })
  refreshToken: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  tenantId: string;
}

export class MeDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() tenantId: string;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional() lastLoginAt?: Date;
}
