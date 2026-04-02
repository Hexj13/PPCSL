import type { NextFunction, Request, Response } from 'express';

import { requestIdMiddleware } from './request-id.middleware';

type RequestWithRequestId = Request & { requestId?: string };

describe('requestIdMiddleware', () => {
  it('keeps a valid incoming request id', () => {
    const req = { headers: { 'x-request-id': 'abc-123' } } as unknown as RequestWithRequestId;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('abc-123');
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'abc-123');
    expect(next).toHaveBeenCalled();
  });

  it('replaces an invalid incoming request id', () => {
    const req = {
      headers: { 'x-request-id': '../../bad value' },
    } as unknown as RequestWithRequestId;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
    expect(next).toHaveBeenCalled();
  });
});
