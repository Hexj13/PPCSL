import { BadRequestException } from '@nestjs/common';

import { DiagnosticsService } from './diagnostics.service';

describe('DiagnosticsService', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.API_URL;
  const originalCfUrl = process.env.AWS_CLOUDFRONT_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.API_URL = originalApiUrl;
    process.env.AWS_CLOUDFRONT_URL = originalCfUrl;
    jest.useRealTimers();
  });

  it('rejects disallowed host', async () => {
    process.env.API_URL = 'https://kupito.onrender.com';
    const service = new DiagnosticsService();
    await expect(service.getImageHeadStatus('https://evil.example/uploads/a.webp')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects path outside uploads on CDN host', async () => {
    process.env.API_URL = 'https://kupito.onrender.com';
    const service = new DiagnosticsService();
    await expect(
      service.getImageHeadStatus('https://cdn.kupito.club/other/a.webp'),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns status from HEAD on allowed CDN URL', async () => {
    process.env.API_URL = 'https://kupito.onrender.com';
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });
    const service = new DiagnosticsService();
    const result = await service.getImageHeadStatus(
      'https://cdn.kupito.club/uploads/983d5801-c770-4a75-a6bb-5a1788051a6e.webp',
    );
    expect(result).toEqual({ status: 200 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://cdn.kupito.club/uploads/983d5801-c770-4a75-a6bb-5a1788051a6e.webp',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('allows optimized image path on API host', async () => {
    process.env.API_URL = 'https://kupito.onrender.com';
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });
    const service = new DiagnosticsService();
    const url = 'https://kupito.onrender.com/api/upload/image/foo.webp?quality=75&width=800';
    const result = await service.getImageHeadStatus(url);
    expect(result).toEqual({ status: 200 });
  });

  it('allows http URL when API_URL itself is http (dev)', async () => {
    process.env.API_URL = 'http://localhost:4000';
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });
    const service = new DiagnosticsService();
    const url = 'http://localhost:4000/api/upload/image/foo.webp?quality=65&width=800';
    const result = await service.getImageHeadStatus(url);
    expect(result).toEqual({ status: 200 });
  });

  it('rejects http URL when configured API host is https', async () => {
    process.env.API_URL = 'https://kupito.onrender.com';
    const service = new DiagnosticsService();
    await expect(
      service.getImageHeadStatus('http://kupito.onrender.com/api/upload/image/foo.webp'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects http URL on different port than configured API host', async () => {
    process.env.API_URL = 'http://localhost:4000';
    const service = new DiagnosticsService();
    await expect(
      service.getImageHeadStatus('http://localhost:9999/api/upload/image/foo.webp'),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps AbortError from HEAD to timeout reason', async () => {
    process.env.API_URL = 'https://kupito.onrender.com';
    global.fetch = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const service = new DiagnosticsService();
    const result = await service.getImageHeadStatus(
      'https://cdn.kupito.club/uploads/983d5801-c770-4a75-a6bb-5a1788051a6e.webp',
    );
    expect(result).toEqual({ status: null, reason: 'timeout' });
  });

  it('maps generic fetch failure to network reason', async () => {
    process.env.API_URL = 'https://kupito.onrender.com';
    global.fetch = jest.fn().mockRejectedValue(new Error('socket'));
    const service = new DiagnosticsService();
    const result = await service.getImageHeadStatus(
      'https://cdn.kupito.club/uploads/983d5801-c770-4a75-a6bb-5a1788051a6e.webp',
    );
    expect(result).toEqual({ status: null, reason: 'network' });
  });
});
