import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { HealthModule } from './modules/health/health.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';

// Entities
import { Tenant } from './modules/tenants/tenant.entity';
import { User } from './modules/users/user.entity';
import { Personnel } from './modules/personnel/personnel.entity';
import { Project } from './modules/projects/project.entity';
import { ProjectFinanceSnapshot } from './modules/projects/project-finance-snapshot.entity';
import { Task } from './modules/tasks/task.entity';
import { TaskPersonnel } from './modules/tasks/task-personnel.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        entities: [Tenant, User, Personnel, Project, ProjectFinanceSnapshot, Task, TaskPersonnel],
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('THROTTLE_TTL') ?? 60000,
        limit: config.get<number>('THROTTLE_LIMIT') ?? 100,
      }],
    }),

    AuthModule,
    UsersModule,
    TenantsModule,
    HealthModule,
    PersonnelModule,
    ProjectsModule,
    TasksModule,
  ],

  providers: [
    { provide: APP_FILTER,       useClass: HttpExceptionFilter },
    { provide: APP_GUARD,        useClass: JwtAuthGuard },
    { provide: APP_GUARD,        useClass: RolesGuard },
    { provide: APP_INTERCEPTOR,  useClass: TransformInterceptor },
  ],
})
export class AppModule {}