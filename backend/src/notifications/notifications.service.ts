import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EmailService } from '../auth/infrastructure/services/email.service';
import {
  LISTING_REFRESH_REMINDER_INTERVAL_MS,
  WEEKLY_VIEWS_DIGEST_WINDOW_MS,
} from '../common/constants';
import { ListingStatus } from '../common/types';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';

type NotificationRecipient = Pick<
  User,
  | 'id'
  | 'email'
  | 'emailVerified'
  | 'emailNotifications'
  | 'emailNotificationListingRefreshReminders'
  | 'emailNotificationWeeklyViewsDigest'
  | 'last_listing_refresh_at'
  | 'last_listing_refresh_reminder_sent_at'
  | 'preferredLocale'
>;

type WeeklyDigestRow = {
  listingId: string;
  title: string;
  status: string;
  viewsCount: number;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly batchSize = 200;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(ListingView)
    private readonly listingViewsRepository: Repository<ListingView>,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 10 * * *')
  async sendListingRefreshReminders(): Promise<void> {
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() - LISTING_REFRESH_REMINDER_INTERVAL_MS);
    let lastSeenId: string | null = null;
    let sent = 0;

    for (;;) {
      const users = await this.getRecipientsBatch(lastSeenId, 'listingRefreshReminders');
      if (users.length === 0) {
        break;
      }

      for (const user of users) {
        lastSeenId = user.id;
        if (!user.email) {
          continue;
        }

        if (user.last_listing_refresh_at && user.last_listing_refresh_at >= refreshThreshold) {
          continue;
        }

        if (
          user.last_listing_refresh_reminder_sent_at &&
          user.last_listing_refresh_reminder_sent_at >= refreshThreshold
        ) {
          continue;
        }

        const activeListingsCount = await this.listingsRepository.count({
          where: {
            user_id: user.id,
            status: ListingStatus.Active,
          },
        });

        if (activeListingsCount === 0) {
          continue;
        }

        try {
          await this.emailService.sendListingRefreshReminder(
            user.email,
            activeListingsCount,
            user.preferredLocale,
          );
          await this.usersRepository.update(user.id, {
            last_listing_refresh_reminder_sent_at: now,
          });
          sent += 1;
        } catch (error) {
          void error;
        }
      }
    }

    this.logger.log(`Listing refresh reminders sent: ${sent}`);
  }

  @Cron('0 11 * * MON')
  async sendWeeklyViewsDigest(): Promise<void> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - WEEKLY_VIEWS_DIGEST_WINDOW_MS);
    let lastSeenId: string | null = null;
    let sent = 0;

    for (;;) {
      const users = await this.getRecipientsBatch(lastSeenId, 'weeklyViewsDigest');
      if (users.length === 0) {
        break;
      }

      for (const user of users) {
        lastSeenId = user.id;
        if (!user.email) {
          continue;
        }

        const topRows = await this.getTopWeeklyViews(user.id, periodStart, periodEnd);
        if (topRows.length === 0) {
          continue;
        }

        try {
          await this.emailService.sendWeeklyViewsDigest(
            user.email,
            topRows.map((row) => ({
              title: row.title,
              views: row.viewsCount,
              status: row.status,
            })),
            periodStart,
            periodEnd,
            user.preferredLocale,
          );
          sent += 1;
        } catch (error) {
          void error;
        }
      }
    }

    this.logger.log(`Weekly views digests sent: ${sent}`);
  }

  private async getRecipientsBatch(
    lastSeenId: string | null,
    notificationType: 'listingRefreshReminders' | 'weeklyViewsDigest',
  ): Promise<NotificationRecipient[]> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.emailVerified',
        'user.emailNotifications',
        'user.emailNotificationListingRefreshReminders',
        'user.emailNotificationWeeklyViewsDigest',
        'user.last_listing_refresh_at',
        'user.last_listing_refresh_reminder_sent_at',
        'user.preferredLocale',
      ])
      .where('user.active = true')
      .andWhere('user.email IS NOT NULL')
      .andWhere('user.emailVerified = true')
      .orderBy('user.id', 'ASC')
      .take(this.batchSize);

    if (notificationType === 'listingRefreshReminders') {
      query.andWhere('user.emailNotificationListingRefreshReminders = true');
    } else {
      query.andWhere('user.emailNotificationWeeklyViewsDigest = true');
    }

    if (lastSeenId) {
      query.andWhere('user.id > :lastSeenId', { lastSeenId });
    }

    return query.getMany();
  }

  private async getTopWeeklyViews(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<WeeklyDigestRow[]> {
    const rows = await this.listingViewsRepository
      .createQueryBuilder('listingView')
      .innerJoin(Listing, 'listing', 'listing.id = listingView.listing_id')
      .select('listing.id', 'listingId')
      .addSelect('listing.title', 'title')
      .addSelect('listing.status', 'status')
      .addSelect('COUNT(listingView.id)', 'viewsCount')
      .where('listing.user_id = :userId', { userId })
      .andWhere('listingView.created_at >= :periodStart', { periodStart })
      .andWhere('listingView.created_at < :periodEnd', { periodEnd })
      .groupBy('listing.id')
      .addGroupBy('listing.title')
      .addGroupBy('listing.status')
      .orderBy('COUNT(listingView.id)', 'DESC')
      .limit(5)
      .getRawMany<{
        listingId: string;
        title: string;
        status: string;
        viewsCount: string;
      }>();

    return rows.map((row) => ({
      listingId: row.listingId,
      title: row.title,
      status: row.status,
      viewsCount: parseInt(row.viewsCount, 10),
    }));
  }
}
