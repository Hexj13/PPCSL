import { Logger } from '@nestjs/common';

import { logUserActionFailure, logUserEvent } from './log-user-event';

describe('log-user-event', () => {
  it('logUserEvent calls logger.log with JSON payload', () => {
    const logger = { log: jest.fn(), warn: jest.fn() } as unknown as Logger;
    logUserEvent(logger, { event: 'test', userId: 'u1' });
    expect(logger.log).toHaveBeenCalledWith('{"event":"test","userId":"u1"}');
    expect((logger as unknown as { warn: jest.Mock }).warn).not.toHaveBeenCalled();
  });

  it('logUserActionFailure calls logger.warn with JSON payload', () => {
    const logger = { log: jest.fn(), warn: jest.fn() } as unknown as Logger;
    logUserActionFailure(logger, { outcome: 'failure', errorKey: 'errors.x', httpStatus: 400 });
    expect(logger.warn).toHaveBeenCalledWith(
      '{"outcome":"failure","errorKey":"errors.x","httpStatus":400}',
    );
    expect((logger as unknown as { log: jest.Mock }).log).not.toHaveBeenCalled();
  });
});
