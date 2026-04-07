import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Full health check — DB, memory, disk',
    description:
      'Returns status of all system components. Used by Docker healthcheck and load balancers.',
  })
  check() {
    return this.health.check([
      // Database connectivity
      () => this.db.pingCheck('database'),

      // Memory — warn if heap exceeds 512MB
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

      // RSS memory — warn if RSS exceeds 1GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get('ping')
  @ApiOperation({
    summary: 'Simple ping — no auth, no DB check (load balancer probe)',
  })
  ping() {
    return {
      status: 'ok',
      version: '3.0',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
