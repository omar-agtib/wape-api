import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { PointagesService } from './pointages.service';
import { CreatePointageDto } from './dto/create-pointage.dto';
import { UpdatePointageDto } from './dto/update-pointage.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { StatutPresence } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('pointages')
@ApiBearerAuth('JWT')
@Controller('pointages')
export class PointagesController {
  constructor(private readonly service: PointagesService) {}

  @Post()
  @RequirePermission('pointages', 'C')
  @ApiOperation({
    summary: 'Créer un pointage journalier — W-PT1',
    description: `Règles:
- RG-PT01: Un seul pointage par opérateur par jour (409 si doublon)
- RG-PT03: heure_fin > heure_debut
- RG-PT06: Statut absent → pas d'heures
- RG-PT07: Date ne peut pas être dans le futur`,
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'POINTAGE_DEJA_EXISTANT (RG-PT01)' })
  @ApiResponse({ status: 422, description: 'RG-PT03 | RG-PT06 | RG-PT07' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePointageDto) {
    return this.service.create(user.tenantId, user.sub, user.role, dto);
  }

  @Get()
  @RequirePermission('pointages', 'R')
  @ApiOperation({ summary: 'Liste des pointages' })
  @ApiQuery({ name: 'datePointage', required: false })
  @ApiQuery({ name: 'operateurId', required: false })
  @ApiQuery({ name: 'projetId', required: false })
  @ApiQuery({ name: 'statutPresence', required: false, enum: StatutPresence })
  @ApiQuery({ name: 'isValide', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('datePointage') datePointage?: string,
    @Query('operateurId') operateurId?: string,
    @Query('projetId') projetId?: string,
    @Query('statutPresence') statutPresence?: StatutPresence,
    @Query('isValide') isValide?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll(user.tenantId, {
      datePointage,
      operateurId,
      projetId,
      statutPresence,
      isValide: isValide !== undefined ? isValide === 'true' : undefined,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('calendrier')
  @RequirePermission('pointages', 'R')
  @ApiOperation({
    summary: "Calendrier mensuel de présence d'un opérateur",
    description: `Retourne tous les jours du mois avec leur statut.
Les jours sans pointage ont le statut \`aucun_pointage\`.
Le calendrier est TOUJOURS complet (tous les jours du mois présents).`,
  })
  @ApiQuery({ name: 'operateurId', required: true })
  @ApiQuery({ name: 'mois', required: true, description: '1-12' })
  @ApiQuery({ name: 'annee', required: true, description: '2026' })
  @ApiQuery({ name: 'projetId', required: false })
  getCalendrier(
    @CurrentUser() user: JwtPayload,
    @Query('operateurId') operateurId: string,
    @Query('mois') mois: string,
    @Query('annee') annee: string,
    @Query('projetId') projetId?: string,
  ) {
    return this.service.getCalendrier(
      user.tenantId,
      operateurId,
      Number(mois),
      Number(annee),
      projetId,
    );
  }

  @Get('stats')
  @RequirePermission('pointages', 'R')
  @ApiOperation({ summary: 'Statistiques de présence agrégées' })
  @ApiQuery({ name: 'projetId', required: false })
  @ApiQuery({ name: 'mois', required: false })
  @ApiQuery({ name: 'annee', required: false })
  getStats(
    @CurrentUser() user: JwtPayload,
    @Query('projetId') projetId?: string,
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.service.getStats(
      user.tenantId,
      projetId,
      mois ? Number(mois) : undefined,
      annee ? Number(annee) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission('pointages', 'R')
  @ApiOperation({ summary: "Détail d'un pointage" })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('pointages', 'U')
  @ApiOperation({
    summary: 'Modifier un pointage non validé',
    description:
      'RG-PT02: impossible si validé. RG-PT08: >7 jours → admin requis.',
  })
  @ApiResponse({
    status: 403,
    description:
      'POINTAGE_VERROUILLE (RG-PT02) | MODIFICATION_TARDIVE (RG-PT08)',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePointageDto,
  ) {
    return this.service.update(user.tenantId, id, user.sub, user.role, dto);
  }

  @Patch(':id/valider')
  @RequirePermission('pointages', 'U')
  @ApiOperation({
    summary: 'Valider un pointage — W-PT2',
    description:
      'Verrouille le pointage (is_valide = TRUE). Irréversible (RG-PT02).',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 409, description: 'POINTAGE_DEJA_VALIDE' })
  valider(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.valider(user.tenantId, id, user.sub);
  }
}
