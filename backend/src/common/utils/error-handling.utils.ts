import type { Logger } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

export function handleDuplicateKeyError(
  error: unknown,
  fieldMessages?: Record<string, string>,
): never {
  if (error instanceof QueryFailedError) {
    const errorMessage = (error as QueryFailedError & { message?: string }).message;
    if (errorMessage && errorMessage.includes('duplicate key')) {
      if (fieldMessages) {
        for (const [field, message] of Object.entries(fieldMessages)) {
          if (
            errorMessage.includes(field) ||
            errorMessage.includes('UQ_97672ac88f789774dd47f7c8be3')
          ) {
            throw new BadRequestException(message);
          }
        }
      }
      throw new BadRequestException('errors.userAlreadyExists');
    }
  }
  throw error;
}

export function removePasswordFromUser<T extends { password?: string }>(
  user: T,
): Omit<T, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function handleUploadError(
  error: unknown,
  logger: Logger,
  logMessage: string,
  userMessage?: string,
): never {
  logger.error(
    `${logMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    error instanceof Error ? error.stack : undefined,
  );
  if (error instanceof BadRequestException) {
    throw error;
  }
  const errorMessage = error instanceof Error ? error.message : 'errors.unknownError';
  throw new BadRequestException(userMessage || `errors.imageProcessingError|${errorMessage}`);
}
