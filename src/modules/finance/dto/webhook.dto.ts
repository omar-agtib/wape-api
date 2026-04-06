import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class WebhookDto {
  @ApiProperty({
    example: 'STRIPE-PI-3NkJ8KLnJh7z4',
    description: 'Unique transaction ID from the payment gateway',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({
    example: {
      gateway: 'stripe',
      event: 'payment_intent.succeeded',
      amount: 150000,
    },
    description: 'Raw gateway response payload for audit logging',
  })
  @IsOptional()
  @IsObject()
  gatewayResponse?: object;
}
