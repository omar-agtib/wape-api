import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ── Self-service — no permission decorator, every authenticated user ───────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: User })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.service.findById(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (name only)' })
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { fullName?: string },
  ) {
    return this.service.updateUser(user.tenantId, user.sub, {
      fullName: dto.fullName,
    });
  }

  // ── Team management — admin only via matrix ───────────────────────────────

  @Get()
  @RequirePermission('users', 'R')
  @ApiOperation({ summary: 'List all users in your company' })
  listTeam(@CurrentUser() user: JwtPayload) {
    return this.service.listByTenant(user.tenantId);
  }

  @Post('invite')
  @RequirePermission('users', 'C')
  @ApiOperation({
    summary: 'Invite a new team member (admin only)',
    description: `Creates a user in your tenant with a temporary password.
**Roles available:** project_manager, site_manager, accountant, viewer.
Admin role cannot be assigned post-registration.`,
  })
  @ApiResponse({ status: 201, type: User })
  @ApiResponse({
    status: 409,
    description: 'USER_ALREADY_EXISTS | ADMIN_ALREADY_EXISTS',
  })
  invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteUserDto) {
    return this.service.invite(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('users', 'U')
  @ApiOperation({
    summary: 'Update team member (admin only)',
    description:
      'Update fullName, role, or isActive. Cannot assign admin role.',
  })
  @ApiResponse({ status: 200, type: User })
  updateUser(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateUser(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('users', 'D')
  @ApiOperation({ summary: 'Deactivate a team member (admin only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'CANNOT_DEACTIVATE_SELF' })
  async deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.deactivate(user.tenantId, id, user.sub);
    return { message: 'User deactivated successfully' };
  }
}
