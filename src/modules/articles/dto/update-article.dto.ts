import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

// barcode_id is immutable after creation (RG05) — omit from update
export class UpdateArticleDto extends PartialType(
  OmitType(CreateArticleDto, ['initialStock'] as const),
) {}