import { hashRefreshToken } from './refresh-token-hash.utils';

describe('refresh-token-hash.utils', () => {
  it('returns stable sha256 hex for the same token', () => {
    const token = 'abc123';
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).toHaveLength(64);
  });

  it('returns different hashes for different tokens', () => {
    expect(hashRefreshToken('token-a')).not.toBe(hashRefreshToken('token-b'));
  });
});
