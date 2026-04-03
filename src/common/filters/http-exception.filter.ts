import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    let error = this.statusToCode(status);
    let message = exception.message;
    let field: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (typeof body === 'object' && body !== null) {
      const b = body as Record<string, unknown>;
      if (Array.isArray(b['message'])) {
        error = 'VALIDATION_ERROR';
        message = 'Request validation failed';
        details = { violations: b['message'] };
      } else {
        error = (b['error'] as string) ?? error;
        message = (b['message'] as string) ?? message;
        field = b['field'] as string | undefined;
        details = b['details'] as Record<string, unknown> | undefined;
      }
    }

    this.logger.warn(`[${request.method}] ${request.url} → ${status} ${error}`);

    response.status(status).json({
      error,
      message,
      ...(field && { field }),
      ...(details && { details }),
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
