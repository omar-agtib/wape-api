import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OperateursService } from './operateurs.service';
import { CreateOperateurDto } from './dto/create-operateur.dto';
import { UpdateOperateurDto } from './dto/update-operateur.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { OperateurStatut } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('operateurs')
@ApiBearerAuth('JWT')
@Controller('operateurs')
export class OperateursController {
  constructor(private readonly service: OperateursService) {}

  @Post()
  @RequirePermission('operateurs', 'C')
  @ApiOperation({ summary: 'Créer un opérateur CDD/journalier' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOperateurDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermission('operateurs', 'R')
  @ApiOperation({ summary: 'Liste des opérateurs' })
  @ApiQuery({ name: 'projetId', required: false })
  @ApiQuery({ name: 'statut', required: false, enum: OperateurStatut })
  @ApiQuery({ name: 'typeContrat', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projetId') projetId?: string,
    @Query('statut') statut?: OperateurStatut,
    @Query('typeContrat') typeContrat?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll(user.tenantId, {
      projetId,
      statut,
      typeContrat,
      search,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get(':id')
  @RequirePermission('operateurs', 'R')
  @ApiOperation({ summary: 'Détail opérateur' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('operateurs', 'U')
  @ApiOperation({ summary: 'Modifier un opérateur' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOperateurDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }
}
