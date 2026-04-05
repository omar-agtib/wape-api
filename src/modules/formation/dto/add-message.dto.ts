import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddMessageDto {
  @ApiProperty({ example: 'Merci pour votre retour. Voici la solution...' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
