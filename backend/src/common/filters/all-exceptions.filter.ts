import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  APP_ERRORS,
  buildAppError,
  findAppErrorByCode,
} from '../errors/app-errors.js';

export interface ErrorBody {
  success: false;
  code: string;
  message: string;
  statusCode: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, code, message } = this.extract(exception);

    this.logger.error(`${request.method} ${request.url} → ${statusCode}`, {
      code,
      message,
    });

    const body: ErrorBody = {
      success: false,
      code,
      message,
      statusCode,
    };

    response.status(statusCode).json(body);
  }

  private extract(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return {
          statusCode: exception.getStatus(),
          code: APP_ERRORS.HTTP_ERROR.code,
          message: res,
        };
      }

      if (typeof res === 'object' && res !== null) {
        const response = res as Record<string, unknown>;
        const code =
          typeof response['code'] === 'string'
            ? response['code']
            : APP_ERRORS.HTTP_ERROR.code;
        const knownError = findAppErrorByCode(code);
        const rawMessage = response['message'];
        const message =
          typeof rawMessage === 'string'
            ? rawMessage
            : Array.isArray(rawMessage)
              ? rawMessage.map(String).join(', ')
              : (knownError?.message ?? exception.message);

        return { statusCode: exception.getStatus(), code, message };
      }

      return {
        statusCode: exception.getStatus(),
        code: APP_ERRORS.HTTP_ERROR.code,
        message: exception.message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      ...buildAppError('INTERNAL_SERVER_ERROR'),
    };
  }
}
