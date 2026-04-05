import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidateTransactionDto {
  @ApiPropertyOptional({
    example: 'Confirmed via bank statement ref BNP-2026-0441',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
