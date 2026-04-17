import { Test, TestingModule } from '@nestjs/testing';

import { DiagnosticsController } from './diagnostics.controller';
import { DiagnosticsService } from './diagnostics.service';

describe('DiagnosticsController', () => {
  let controller: DiagnosticsController;
  let service: jest.Mocked<DiagnosticsService>;

  beforeEach(async () => {
    const mockService = {
      getImageHeadStatus: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiagnosticsController],
      providers: [{ provide: DiagnosticsService, useValue: mockService }],
    }).compile();

    controller = module.get(DiagnosticsController);
    service = module.get(DiagnosticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates to DiagnosticsService', async () => {
    service.getImageHeadStatus.mockResolvedValue({ status: 404 });
    const result = await controller.imageStatus('https://cdn.kupito.club/uploads/x.webp');
    expect(service.getImageHeadStatus).toHaveBeenCalledWith(
      'https://cdn.kupito.club/uploads/x.webp',
    );
    expect(result).toEqual({ status: 404 });
  });
});
