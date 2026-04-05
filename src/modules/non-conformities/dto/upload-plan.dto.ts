import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UploadPlanDto {
  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/plans/plan-n3.pdf',
    description: 'S3 URL of the uploaded plan (PDF or image)',
  })
  @IsString()
  @IsNotEmpty()
  planUrl: string;

  @ApiPropertyOptional({
    example: 42.5,
    description: 'Marker X position (0–100%)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  markerX?: number;

  @ApiPropertyOptional({
    example: 67.3,
    description: 'Marker Y position (0–100%)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  markerY?: number;
}
