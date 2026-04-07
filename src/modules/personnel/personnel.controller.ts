import {
  Controller,
  Get,
  Post,
  Put,
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
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { Personnel } from './personnel.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('personnel')
@ApiBearerAuth('JWT')
@Controller('personnel')
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Create a personnel member' })
  @ApiResponse({ status: 201, type: Personnel })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePersonnelDto,
  ): Promise<Personnel> {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all personnel (paginated)' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiResponse({ status: 200 })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user.tenantId, pagination, { role, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get personnel member by ID' })
  @ApiResponse({ status: 200, type: Personnel })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Personnel> {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({
    summary: 'Update personnel member',
    description:
      'Updating costPerHour does NOT affect existing task assignments (cost independence rule).',
  })
  @ApiResponse({ status: 200, type: Personnel })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePersonnelDto,
  ): Promise<Personnel> {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete personnel member' })
  @ApiResponse({ status: 200 })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Personnel member deleted successfully' };
  }
}
