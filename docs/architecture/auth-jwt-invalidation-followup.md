# Follow-up: JWT invalidation after password change

## Current behavior

- `change-password` and `reset-password` revoke all refresh tokens and clear auth cookies.
- Existing access JWTs remain valid until their expiry (~1 hour).

## Recommended follow-up PR

1. Add `tokenVersion` (integer) or `passwordChangedAt` (timestamp) column on `users`.
2. Include the field in JWT payload at login/refresh.
3. In `JwtStrategy.validate()`, reject tokens when the payload version is older than the user record.
4. Increment version on password change, reset, and admin deactivation.
5. Add integration tests for: change password → old access token returns 401.

This is a breaking change for long-lived tabs; acceptable for security hardening.
