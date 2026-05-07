import { describe, expect, it } from '@jest/globals';

import { assertIpIsPublicForFetch } from './safe-video-import-url';

describe('safe-video-import-url', () => {
  describe('assertIpIsPublicForFetch', () => {
    it('allows common public IPv4', () => {
      expect(() => assertIpIsPublicForFetch('8.8.8.8')).not.toThrow();
      expect(() => assertIpIsPublicForFetch('1.1.1.1')).not.toThrow();
    });

    it('rejects loopback and RFC1918 IPv4', () => {
      expect(() => assertIpIsPublicForFetch('127.0.0.1')).toThrow();
      expect(() => assertIpIsPublicForFetch('10.0.0.1')).toThrow();
      expect(() => assertIpIsPublicForFetch('192.168.1.1')).toThrow();
      expect(() => assertIpIsPublicForFetch('172.16.0.1')).toThrow();
      expect(() => assertIpIsPublicForFetch('169.254.1.1')).toThrow();
    });

    it('rejects CGNAT range', () => {
      expect(() => assertIpIsPublicForFetch('100.64.0.1')).toThrow();
    });

    it('rejects IPv6 loopback and unique local', () => {
      expect(() => assertIpIsPublicForFetch('::1')).toThrow();
      expect(() => assertIpIsPublicForFetch('fc00::1')).toThrow();
      expect(() => assertIpIsPublicForFetch('fe80::1')).toThrow();
    });
  });
});
