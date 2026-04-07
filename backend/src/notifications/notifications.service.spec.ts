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
