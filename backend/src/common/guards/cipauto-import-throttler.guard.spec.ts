import { ExecutionContext } from '@nestjs/common';

import { CipautoImportThrottlerGuard } from './cipauto-import-throttler.guard';

describe('CipautoImportThrottlerGuard', () => {
  let guard: CipautoImportThrottlerGuard;

  beforeEach(() => {
    guard = new CipautoImportThrottlerGuard({} as any, {} as any, {} as any);
  });

  afterEach(() => {
    delete process.env.CIPAUTO_IMPORT_SECRET;
  });

  it('should skip throttling for valid import secret', async () => {
    process.env.CIPAUTO_IMPORT_SECRET = 'secret123';

    const mockRequest = {
      method: 'POST',
      originalUrl: '/api/upload/image',
      headers: {
        'x-import-secret': 'secret123',
      },
    } as any;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getClass: () => ({ name: 'UploadController' }),
      getHandler: () => ({ name: 'uploadImage' }),
    } as any as ExecutionContext;

    await expect((guard as any).shouldSkip(mockContext)).resolves.toBe(true);
  });

  it('should not skip throttling for invalid secret', async () => {
    process.env.CIPAUTO_IMPORT_SECRET = 'secret123';

    const mockRequest = {
      method: 'POST',
      originalUrl: '/api/upload/image',
      headers: {
        'x-import-secret': 'wrong',
      },
    } as any;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getClass: () => ({ name: 'UploadController' }),
      getHandler: () => ({ name: 'uploadImage' }),
    } as any as ExecutionContext;

    await expect((guard as any).shouldSkip(mockContext)).resolves.toBe(false);
  });

  it('should not skip throttling when env secret is missing', async () => {
    const mockRequest = {
      method: 'POST',
      originalUrl: '/api/upload/image',
      headers: {
        'x-import-secret': 'secret123',
      },
    } as any;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getClass: () => ({ name: 'UploadController' }),
      getHandler: () => ({ name: 'uploadImage' }),
    } as any as ExecutionContext;

    await expect((guard as any).shouldSkip(mockContext)).resolves.toBe(false);
  });

  it('should not skip throttling for other routes', async () => {
    process.env.CIPAUTO_IMPORT_SECRET = 'secret123';

    const mockRequest = {
      method: 'POST',
      originalUrl: '/api/upload/something-else',
      headers: {
        'x-import-secret': 'secret123',
      },
    } as any;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getClass: () => ({ name: 'UploadController' }),
      getHandler: () => ({ name: 'uploadImage' }),
    } as any as ExecutionContext;

    await expect((guard as any).shouldSkip(mockContext)).resolves.toBe(false);
  });
});
