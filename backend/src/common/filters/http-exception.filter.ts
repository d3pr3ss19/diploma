import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

import { ApiErrorResponse } from '../types/api-error.type';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as Record<string, unknown> | string;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse.message as string | string[] | undefined) || exception.message;

    const payload: ApiErrorResponse = {
      statusCode: status,
      error: HttpStatus[status] || 'Error',
      message,
      details: typeof exceptionResponse === 'string' ? undefined : exceptionResponse,
      timestamp: new Date().toISOString(),
      path: request.url
    };

    response.status(status).json(payload);
  }
}
