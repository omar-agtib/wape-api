import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

export class CreateSubcontractorPaymentDto {
  @ApiProperty({ example: 'uuid-of-subcontractor-contact' })
  @IsUUID()
  subcontractorId: string;

  @ApiProperty({ example: 'uuid-of-project' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ example: 'uuid-of-task' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-wape-invoice' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiProperty({ example: 85000.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  contractAmount: number;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES)
  currency: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
