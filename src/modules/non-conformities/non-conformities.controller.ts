import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NonConformitiesService } from './non-conformities.service';
import { CreateNcDto } from './dto/create-nc.dto';
import { UpdateNcDto } from './dto/update-nc.dto';
import { NcFilterDto } from './dto/nc-filter.dto';
import { AddNcImageDto } from './dto/add-nc-image.dto';
import { UploadPlanDto } from './dto/upload-plan.dto';
import { UpdateNcStatusDto } from './dto/update-nc-status.dto';
import { NonConformity } from './non-conformity.entity';
import { NcImage } from './nc-image.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('non-conformities')
@ApiBearerAuth('JWT')
@Controller('non-conformities')
export class NonConformitiesController {
  constructor(private readonly service: NonConformitiesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Report a non-conformity' })
  @ApiResponse({ status: 201, type: NonConformity })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNcDto,
  ): Promise<NonConformity> {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List non-conformities (paginated + filters)' })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: NcFilterDto) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get NC detail with images',
    description:
      'Returns `planUrl`, `markerX`, `markerY` and array of image URLs. Frontend positions marker with `left: markerX%` and `top: markerY%`.',
  })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update NC details' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateNcDto,
  ): Promise<NonConformity> {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({
    summary: 'Change NC status',
    description:
      'Valid transitions: `open ↔ in_review`, `in_review → closed`, `open → closed`. `closed` is terminal.',
  })
  @ApiResponse({ status: 200, type: NonConformity })
  @ApiResponse({ status: 422, description: 'INVALID_NC_STATUS_TRANSITION' })
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateNcStatusDto,
  ): Promise<NonConformity> {
    return this.service.updateStatus(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete NC' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Non-conformity deleted successfully' };
  }

  @Post(':id/images')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({
    summary: 'Add an image to a NC',
    description:
      'Pass the S3 URL after uploading the file directly to S3. Returns the saved NcImage record.',
  })
  @ApiResponse({ status: 201, type: NcImage })
  addImage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddNcImageDto,
  ): Promise<NcImage> {
    return this.service.addImage(user.tenantId, id, dto);
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'List all images for a NC' })
  listImages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<NcImage[]> {
    return this.service.listImages(user.tenantId, id);
  }

  @Patch(':id/plan')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({
    summary: 'Upload a site plan + set marker position',
    description:
      '`markerX` and `markerY` are percentages (0–100) of plan dimensions. Frontend positions with `left: markerX%` and `top: markerY%`.',
  })
  @ApiResponse({ status: 200, type: NonConformity })
  uploadPlan(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UploadPlanDto,
  ): Promise<NonConformity> {
    return this.service.uploadPlan(user.tenantId, id, dto);
  }
}
