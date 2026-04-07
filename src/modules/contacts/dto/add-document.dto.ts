import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AddContactDocumentDto {
  @ApiProperty({ example: 'Contrat-cadre-2026.pdf' })
  @IsString()
  @IsNotEmpty()
  documentName: string;

  @ApiProperty({
    example: 'contract',
    enum: ['contract', 'agreement', 'legal', 'other'],
  })
  @IsIn(['contract', 'agreement', 'legal', 'other'])
  documentType: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/file.pdf',
    description: 'S3 URL of uploaded file',
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}
