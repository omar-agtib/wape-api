import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;
  const nodeEnv = config.get<string>('app.nodeEnv') ?? 'development';

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  app.enableCors({ origin: true, credentials: true });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('WAPE API')
      .setDescription('ERP Construction & Ingénierie — Backend SaaS v3.0')
      .setVersion('3.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('auth', 'Authentication — register, login, refresh, me')
      .addTag('health', 'Health check')
      .addTag('projects', 'Projects')
      .addTag('tasks', 'Tasks')
      .addTag('personnel', 'Personnel')
      .addTag('tools', 'Tools')
      .addTag('articles', 'Articles & Stock')
      .addTag('stock', 'Stock movements')
      .addTag('contacts', 'Contacts')
      .addTag('purchase-orders', 'Purchase Orders')
      .addTag('receptions', 'Receptions')
      .addTag('attachments', 'Attachments')
      .addTag('invoices', 'Invoices')
      .addTag('finance', 'Finance')
      .addTag('non-conformities', 'Non-Conformities')
      .addTag('documents', 'Documents')
      .addTag('gantt', 'Gantt')
      .addTag('formation', 'Formation & Support')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
      customSiteTitle: 'WAPE API Docs',
    });

    console.log(`\n📚 Swagger  →  http://localhost:${port}/api/docs\n`);
  }

  await app.listen(port);
  console.log(`🚀 WAPE API  →  http://localhost:${port}/api  [${nodeEnv}]`);
}

void bootstrap();
