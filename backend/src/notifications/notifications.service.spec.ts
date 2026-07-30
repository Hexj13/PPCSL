import { NotificationsService } from './notifications.service';

type QueryBuilderMock = {
  select: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  take: jest.Mock;
  getMany: jest.Mock;
};

function createQueryBuilderMock(): QueryBuilderMock {
  const queryBuilder = {
    select: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn(),
  } as unknown as QueryBuilderMock;

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  queryBuilder.orderBy.mockReturnValue(queryBuilder);
  queryBuilder.take.mockReturnValue(queryBuilder);
  queryBuilder.getMany.mockResolvedValue([]);

  return queryBuilder;
}

describe('NotificationsService', () => {
  it('should query only verified emails for listing refresh reminders', async () => {
    const queryBuilder = createQueryBuilderMock();
    const usersRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new NotificationsService(
      usersRepository as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await (
      service as unknown as {
        getRecipientsBatch: (
          lastSeenId: string | null,
          notificationType: 'listingRefreshReminders' | 'weeklyViewsDigest',
        ) => Promise<unknown[]>;
      }
    ).getRecipientsBatch(null, 'listingRefreshReminders');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.emailVerified = true');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.emailNotificationListingRefreshReminders = true',
    );
  });

  it('does not send weekly views digest when feature is disabled', async () => {
    const previous = process.env.WEEKLY_VIEWS_DIGEST_ENABLED;
    delete process.env.WEEKLY_VIEWS_DIGEST_ENABLED;
    try {
      const emailService = { sendWeeklyViewsDigest: jest.fn() };
      const service = new NotificationsService(
        {} as never,
        {} as never,
        {} as never,
        emailService as never,
      );

      await service.sendWeeklyViewsDigest();

      expect(emailService.sendWeeklyViewsDigest).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) {
        delete process.env.WEEKLY_VIEWS_DIGEST_ENABLED;
      } else {
        process.env.WEEKLY_VIEWS_DIGEST_ENABLED = previous;
      }
    }
  });

  it('should query only verified emails for weekly digest', async () => {
    const queryBuilder = createQueryBuilderMock();
    const usersRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new NotificationsService(
      usersRepository as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await (
      service as unknown as {
        getRecipientsBatch: (
          lastSeenId: string | null,
          notificationType: 'listingRefreshReminders' | 'weeklyViewsDigest',
        ) => Promise<unknown[]>;
      }
    ).getRecipientsBatch(null, 'weeklyViewsDigest');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.emailVerified = true');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.emailNotificationWeeklyViewsDigest = true',
    );
  });
});
