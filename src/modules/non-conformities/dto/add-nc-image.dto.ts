import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddNcImageDto {
  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/nc-images/fissure-n3.jpg',
    description: 'S3 URL of the uploaded image',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;
}
