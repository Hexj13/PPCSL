import { ForbiddenException } from '@nestjs/common';

import { PhoneVerifiedGuard } from './phone-verified.guard';

describe('PhoneVerifiedGuard', () => {
  let guard: PhoneVerifiedGuard;

  beforeEach(() => {
    guard = new PhoneVerifiedGuard();
  });

  const buildContext = (user: { id?: string; phoneVerified?: boolean } | undefined) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as never;

  it('allows when phoneVerified claim is true', () => {
    expect(guard.canActivate(buildContext({ id: 'u1', phoneVerified: true }))).toBe(true);
  });

  it('throws when phoneVerified claim is false', () => {
    expect(() => guard.canActivate(buildContext({ id: 'u1', phoneVerified: false }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws when phoneVerified claim is missing', () => {
    expect(() => guard.canActivate(buildContext({ id: 'u1' }))).toThrow(ForbiddenException);
  });

  it('returns false when there is no authenticated principal', () => {
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
