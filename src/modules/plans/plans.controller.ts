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
  ApiQuery,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { NouvelleVersionDto } from './dto/nouvelle-version.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('plans')
@ApiBearerAuth('JWT')
@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansService) {}

  @Post()
  @RequirePermission('plans', 'C')
  @ApiOperation({
    summary: 'Créer un plan — W-PL2',
    description:
      "Upload le fichier via /upload/file d'abord, puis passez la secureUrl ici.",
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlanDto) {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @RequirePermission('plans', 'R')
  @ApiOperation({ summary: 'Liste des plans' })
  @ApiQuery({ name: 'projetId', required: false })
  @ApiQuery({ name: 'categorie', required: false })
  @ApiQuery({ name: 'statut', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projetId') projetId?: string,
    @Query('categorie') categorie?: string,
    @Query('statut') statut?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll(user.tenantId, {
      projetId,
      categorie,
      statut,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get(':id')
  @RequirePermission('plans', 'R')
  @ApiOperation({ summary: 'Détail plan + nombre NC liées' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('plans', 'U')
  @ApiOperation({
    summary:
      'Modifier métadonnées du plan (nom, description, catégorie, statut)',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/nouvelle-version')
  @RequirePermission('plans', 'U')
  @ApiOperation({
    summary: 'Uploader une nouvelle version du plan — W-PL1',
    description: `Archive la version courante dans plan_versions.
Toutes les NC liées voient automatiquement la nouvelle version via JOIN (synchronisation implicite).
Notifie les responsables des NC ouvertes (async).`,
  })
  @ApiResponse({ status: 200 })
  nouvelleVersion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: NouvelleVersionDto,
  ) {
    return this.service.nouvelleVersion(user.tenantId, id, user.sub, dto);
  }

  @Get(':id/versions')
  @RequirePermission('plans', 'R')
  @ApiOperation({ summary: "Historique des versions d'un plan" })
  getVersions(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getVersions(user.tenantId, id);
  }

  @Get(':id/non-conformites')
  @RequirePermission('plans', 'R')
  @ApiOperation({ summary: 'Liste des NC liées à ce plan avec marqueurs' })
  getNonConformites(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getNonConformites(user.tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('plans', 'D')
  @ApiOperation({
    summary: 'Supprimer un plan',
    description: 'Bloqué si NC active(s) liée(s) — RG-PL03',
  })
  @ApiResponse({ status: 409, description: 'PLAN_HAS_ACTIVE_NC (RG-PL03)' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Plan supprimé' };
  }
}
