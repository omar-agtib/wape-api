import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createWinstonLogger } from './config/logger.config';
import compression from 'compression';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;
  const nodeEnv = config.get<string>('app.nodeEnv') ?? 'development';

  // ── Logging ────────────────────────────────────────────────────────────────
  app.useLogger(createWinstonLogger(nodeEnv));

  // ── Security ───────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production',
      crossOriginEmbedderPolicy: nodeEnv === 'production',
      hsts:
        nodeEnv === 'production'
          ? { maxAge: 31536000, includeSubDomains: true }
          : false,
    }),
  );

  app.use(compression());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
        : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // ── Global prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Global validation pipe ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // ── Shutdown hooks ─────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Swagger (non-production only) ──────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('WAPE API')
      .setDescription(
        `## WAPE — Work & Assets Project ERP
**ERP Construction & Ingénierie** — Backend SaaS v3.0

### Authentication
1. \`POST /api/auth/register\` → create company + admin
2. \`POST /api/auth/login\` → get \`accessToken\`
3. Click **Authorize 🔒** → paste token (no "Bearer ")

### Error Format
\`\`\`json
{ "error": "ERROR_CODE", "message": "...", "field": "...", "details": {} }
\`\`\``,
      )
      .setVersion('3.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addServer(`http://localhost:${port}`, 'Local Development')
      .addServer('https://api.wape.ma', 'Production')
      .addTag('auth', 'Authentication')
      .addTag('health', 'Health checks')
      .addTag('projects', 'Projects')
      .addTag('tasks', 'Tasks')
      .addTag('personnel', 'Personnel')
      .addTag('tools', 'Tools')
      .addTag('articles', 'Articles')
      .addTag('stock', 'Stock movements')
      .addTag('contacts', 'Contacts')
      .addTag('purchase-orders', 'Purchase Orders')
      .addTag('receptions', 'Receptions')
      .addTag('attachments', 'Attachments')
      .addTag('invoices', 'Invoices')
      .addTag('finance', 'Finance & Payments')
      .addTag('non-conformities', 'Non-Conformities')
      .addTag('documents', 'Documents')
      .addTag('gantt', 'Gantt')
      .addTag('formation', 'Formation & Support')
      .addTag('upload', 'File uploads — Cloudinary')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
      customSiteTitle: 'WAPE API Docs',
    });

    console.log(`\n📚 Swagger  →  http://localhost:${port}/api/docs`);
    console.log(`🏓 Health   →  http://localhost:${port}/api/health\n`);
  }

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 WAPE API running on port ${port} [${nodeEnv}]`);
}

void bootstrap();
