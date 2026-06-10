import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum MovementDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export class CreateToolMovementDto {
  @ApiProperty({
    enum: MovementDirection,
    example: 'OUT',
    description: 'IN = return to depot, OUT = deploy to site',
  })
  @IsEnum(MovementDirection)
  movementType: MovementDirection;

  @ApiProperty({ example: 'uuid-of-responsible-personnel' })
  @IsUUID()
  responsibleId: string;

  @ApiPropertyOptional({ description: 'Project this movement relates to' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    example: '2026-04-16',
    description: 'Movement date — defaults to now if omitted',
  })
  @IsOptional()
  @IsDateString()
  movementDate?: string;

  @ApiPropertyOptional({ example: 'Deployed to site Bloc A' })
  @IsOptional()
  @IsString()
  notes?: string;
}
