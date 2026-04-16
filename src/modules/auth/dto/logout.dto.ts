import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token to invalidate' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
