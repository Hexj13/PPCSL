import type { Request } from 'express';

import {
  buildUserActionFailureContext,
  shouldLogUserActionFailure,
} from './user-action-failure-log.utils';

describe('user-action-failure-log.utils', () => {
  describe('shouldLogUserActionFailure', () => {
    it('returns true for allowlisted prefix', () => {
      expect(shouldLogUserActionFailure('/api/auth/login', 'POST')).toBe(true);
      expect(shouldLogUserActionFailure('/api/users', 'GET')).toBe(true);
      expect(shouldLogUserActionFailure('/api/favorites/x', 'DELETE')).toBe(true);
      expect(shouldLogUserActionFailure('/api/comparison/ids', 'GET')).toBe(true);
      expect(shouldLogUserActionFailure('/api/comparison/x', 'DELETE')).toBe(true);
    });

    it('returns false for disallowed API areas', () => {
      expect(shouldLogUserActionFailure('/api/brands', 'GET')).toBe(false);
      expect(shouldLogUserActionFailure('/api/upload', 'POST')).toBe(false);
    });

    it('returns false for listing search GET (exact path)', () => {
      expect(shouldLogUserActionFailure('/api/listings', 'GET')).toBe(false);
    });

    it('returns true for GET single listing or subresource', () => {
      expect(
        shouldLogUserActionFailure('/api/listings/550e8400-e29b-41d4-a716-446655440000', 'GET'),
      ).toBe(true);
    });

    it('returns false for guest refresh without cookie (expected noise)', () => {
      expect(shouldLogUserActionFailure('/api/auth/refresh', 'POST', 'errors.unauthorized')).toBe(
        false,
      );
    });

    it('returns true for refresh with invalid or revoked token', () => {
      expect(
        shouldLogUserActionFailure('/api/auth/refresh', 'POST', 'errors.invalidRefreshToken'),
      ).toBe(true);
    });
  });

  describe('buildUserActionFailureContext', () => {
    it('includes outcome, errorKey, status, method, path and userId', () => {
      const request = {
        path: '/api/auth/login',
        method: 'POST',
        params: {},
        user: { id: 'actor-1' },
      } as unknown as Request;

      expect(buildUserActionFailureContext(request, 401, 'errors.invalidLoginCredentials')).toEqual(
        {
          outcome: 'failure',
          errorKey: 'errors.invalidLoginCredentials',
          httpStatus: 401,
          method: 'POST',
          path: '/api/auth/login',
          userId: 'actor-1',
        },
      );
    });

    it('maps listing id from route params', () => {
      const request = {
        path: '/api/listings/550e8400-e29b-41d4-a716-446655440000',
        method: 'PATCH',
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as unknown as Request;

      expect(buildUserActionFailureContext(request, 403, 'errors.listingAccessDenied')).toEqual({
        outcome: 'failure',
        errorKey: 'errors.listingAccessDenied',
        httpStatus: 403,
        method: 'PATCH',
        path: '/api/listings/550e8400-e29b-41d4-a716-446655440000',
        listingId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('maps listingId from comparison route params', () => {
      const request = {
        path: '/api/comparison/550e8400-e29b-41d4-a716-446655440000',
        method: 'DELETE',
        params: { listingId: '550e8400-e29b-41d4-a716-446655440000' },
        user: { id: 'actor-1' },
      } as unknown as Request;

      expect(buildUserActionFailureContext(request, 404, 'errors.comparisonNotFound')).toEqual({
        outcome: 'failure',
        errorKey: 'errors.comparisonNotFound',
        httpStatus: 404,
        method: 'DELETE',
        path: '/api/comparison/550e8400-e29b-41d4-a716-446655440000',
        userId: 'actor-1',
        listingId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('maps userId listing param for user active listings route', () => {
      const request = {
        path: '/api/listings/user/u2/active',
        method: 'GET',
        params: { userId: 'u2' },
      } as unknown as Request;

      expect(buildUserActionFailureContext(request, 404, 'errors.notFound')).toMatchObject({
        targetUserId: 'u2',
        path: '/api/listings/user/u2/active',
      });
    });
  });
});
