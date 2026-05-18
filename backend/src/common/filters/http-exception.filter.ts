import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

import {
  AccessDeniedError,
  ConflictError,
  DomainError,
  LimitExceededError,
  NotFoundError,
  ValidationError,
} from '../errors/domain.errors';
import { I18nService } from '../i18n/i18n.service';
import { logUserActionFailure } from '../utils/log-user-event';
import { sanitizeForSentryExtra } from '../utils/sentry-payload.utils';
import {
  buildUserActionFailureContext,
  shouldLogUserActionFailure,
} from '../utils/user-action-failure-log.utils';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly i18nService: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const acceptLanguage = request.headers?.['accept-language'];
    const locale = this.i18nService.getLocaleFromHeader(acceptLanguage);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = this.i18nService.translate('errors.serverError', locale);
    let code: string | undefined;
    let errorKey: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorKey = this.getErrorKey(exceptionResponse);
        message = this.translateMessage(exceptionResponse, locale);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          code?: string;
        };
        if (responseObj.message) {
          if (Array.isArray(responseObj.message)) {
            const firstMsg = responseObj.message[0];
            errorKey = typeof firstMsg === 'string' ? this.getErrorKey(firstMsg) : undefined;
            message = responseObj.message
              .map((msg) => this.translateMessage(msg, locale))
              .join('; ');
          } else {
            errorKey = this.getErrorKey(responseObj.message);
            message = this.translateMessage(responseObj.message, locale);
          }
        }
        code = responseObj.code;
      }
    } else if (exception instanceof DomainError) {
      status = this.mapDomainErrorToStatus(exception);
      code = exception.code;
      errorKey = this.getErrorKey(exception.message);
      message = this.translateMessage(exception.message, locale);
    } else if (exception instanceof Error) {
      const isDbConnectivity = this.isDatabaseConnectivityFailure(exception);
      if (isDbConnectivity) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        errorKey = 'errors.serviceUnavailable';
        message = this.i18nService.translate('errors.serviceUnavailable', locale);
      }

      const logLabel = isDbConnectivity ? '[db_connectivity]' : 'Unhandled exception';
      this.logger.error(
        `${logLabel}: ${exception.message} | ${request.method} ${request.url}`,
        exception.stack,
        HttpExceptionFilter.name,
      );

      Sentry.captureException(exception, {
        tags: {
          httpStatus: status,
          httpMethod: request.method,
          httpPath: request.url,
          errorType: isDbConnectivity ? 'database_connectivity' : 'unhandled',
          errorCategory: isDbConnectivity ? 'database_connectivity' : 'application',
          ...(request.requestId ? { requestId: request.requestId } : {}),
        },
        extra: {
          requestBody: sanitizeForSentryExtra(request.body),
          queryParams: sanitizeForSentryExtra(request.query),
          params: sanitizeForSentryExtra(request.params),
          ...(request.user?.id ? { userId: request.user.id } : {}),
        },
      });
    }

    if (status >= 500 && exception instanceof HttpException) {
      this.logger.error(
        `HTTP ${status} Error: ${message} | ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
        HttpExceptionFilter.name,
      );

      Sentry.captureException(exception, {
        tags: {
          httpStatus: status,
          httpMethod: request.method,
          httpPath: request.url,
          ...(request.requestId ? { requestId: request.requestId } : {}),
        },
        extra: {
          requestBody: sanitizeForSentryExtra(request.body),
          queryParams: sanitizeForSentryExtra(request.query),
          params: sanitizeForSentryExtra(request.params),
          ...(request.user?.id ? { userId: request.user.id } : {}),
        },
      });
    }

    if (
      (exception instanceof HttpException || exception instanceof DomainError) &&
      status >= HttpStatus.BAD_REQUEST &&
      status < HttpStatus.INTERNAL_SERVER_ERROR &&
      errorKey?.startsWith('errors.') &&
      shouldLogUserActionFailure(request.path, request.method, errorKey)
    ) {
      logUserActionFailure(this.logger, buildUserActionFailureContext(request, status, errorKey));
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(code && { code }),
      ...(errorKey && { errorKey }),
    });
  }

  private getErrorKey(message: string): string | undefined {
    if (
      typeof message !== 'string' ||
      !(message.startsWith('validation.') || message.startsWith('errors.'))
    ) {
      return undefined;
    }
    const [key] = message.split('|');
    return key;
  }

  private translateMessage(message: string, locale: string): string {
    if (message.startsWith('validation.') || message.startsWith('errors.')) {
      const [key, ...params] = message.split('|');
      let translated = this.i18nService.translate(key, locale);

      if (params.length > 0) {
        if (translated.includes('{count}')) {
          translated = translated.replace(/{count}/g, params[0]);
        }
        if (translated.includes('{max}')) {
          translated = translated.replace(/{max}/g, params[0]);
        }
        if (translated.includes('{error}')) {
          translated = translated.replace('{error}', params[0]);
        }
        if (translated.includes('{brand}')) {
          translated = translated.replace('{brand}', params[0]);
        }
      }

      return translated;
    }
    return message;
  }

  private mapDomainErrorToStatus(error: DomainError): HttpStatus {
    if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    if (error instanceof AccessDeniedError) return HttpStatus.FORBIDDEN;
    if (error instanceof LimitExceededError) return HttpStatus.BAD_REQUEST;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private isDatabaseConnectivityFailure(exception: Error): boolean {
    const message = exception.message.toLowerCase();

    return (
      message.includes('connection terminated due to connection timeout') ||
      message.includes('timeout exceeded when trying to connect') ||
      message.includes('connect etimedout') ||
      message.includes('econnrefused') ||
      message.includes('connect econnrefused')
    );
  }
}
