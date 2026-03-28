import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { ApiErrorResponse } from '../types/api-error.type';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.BAD_REQUEST;
    let message = 'Database request failed';

    if (exception.code === 'P2002') {
      statusCode = HttpStatus.CONFLICT;
      message = 'Unique constraint violation';
    }

    if (exception.code === 'P2025') {
      statusCode = HttpStatus.NOT_FOUND;
      message = 'Record not found';
    }

    const payload: ApiErrorResponse = {
      statusCode,
      error: HttpStatus[statusCode],
      message,
      details: {
        code: exception.code,
        meta: exception.meta
      },
      timestamp: new Date().toISOString(),
      path: request.url
    };

    response.status(statusCode).json(payload);
  }
}
