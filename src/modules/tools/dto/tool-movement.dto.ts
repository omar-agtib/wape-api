import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum MovementDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export class CreateToolMovementDto {
  @ApiProperty({ enum: MovementDirection, example: 'OUT', description: 'IN = return to depot, OUT = deploy to site' })
  @IsEnum(MovementDirection)
  movementType: MovementDirection;

  @ApiProperty({ example: 'uuid-of-responsible-personnel' })
  @IsUUID()
  responsibleId: string;

  @ApiPropertyOptional({ example: 'Deployed to site Bloc A' })
  @IsOptional() @IsString()
  notes?: string;
}