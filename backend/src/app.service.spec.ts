import { Test, TestingModule } from '@nestjs/testing';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  const originalSiteName = process.env.SITE_NAME;

  beforeEach(async () => {
    process.env.SITE_NAME = 'Brand';
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();
    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    if (originalSiteName === undefined) {
      delete process.env.SITE_NAME;
    } else {
      process.env.SITE_NAME = originalSiteName;
    }
  });

  it('returns the platform API greeting', () => {
    expect(service.getHello()).toBe('Brand API v1.0');
  });
});
