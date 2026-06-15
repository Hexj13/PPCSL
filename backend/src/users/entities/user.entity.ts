import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import * as constants from '../../common/constants';
import { UserType } from '../../common/types';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { Listing } from '../../listings/entities/listing.entity';

@Entity('users')
@Index(['phone'], { where: '"phone" IS NOT NULL' })
@Index(['type'])
@Index(['active'])
@Index(['isPlatformPartner'])
@Index(['board_slug'], { unique: true, where: '"board_slug" IS NOT NULL' })
@Index(['telegramId'], { unique: true, where: '"telegram_id" IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Expose()
  id: string;

  @Column({
    type: 'enum',
    enum: constants.userTypes,
    default: constants.userTypes[0],
  })
  type: UserType;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'google_id' })
  googleId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'telegram_id' })
  telegramId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'telegram_username' })
  telegramUsername: string | null;

  @Column({ type: 'varchar', length: 16, default: 'local', name: 'auth_provider' })
  authProvider: 'local' | 'google' | 'telegram';

  @Column({ type: 'varchar', select: false, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'additional_phone' })
  additionalPhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'company_website_url' })
  companyWebsiteUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  board_slug: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_platform_partner' })
  isPlatformPartner: boolean;

  @Column({ type: 'integer', default: 0, name: 'free_promotion_balance' })
  freePromotionBalance: number;

  @Column({ type: 'integer', default: 0, name: 'partner_listing_progress' })
  partnerListingProgress: number;

  @Column({ type: 'boolean', default: false, name: 'hide_partner_promo_banner' })
  hidePartnerPromoBanner: boolean;

  @Column({ type: 'boolean', default: false })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  emailNotificationListingRefreshReminders: boolean;

  @Column({ type: 'boolean', default: false })
  emailNotificationWeeklyViewsDigest: boolean;

  @Column({ type: 'boolean', default: false })
  emailNotificationSecurityAlerts: boolean;

  @Column({ type: 'boolean', default: false })
  viber: boolean;

  @Column({ type: 'boolean', default: false })
  whatsapp: boolean;

  @Column({ type: 'boolean', default: false })
  telegram: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'preferred_locale' })
  preferredLocale?: string | null;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'boolean', nullable: true })
  emailVerified: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  registration_ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  last_login_ip: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_login_at' })
  @Exclude()
  last_login_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_listing_refresh_at' })
  @Exclude()
  last_listing_refresh_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_listing_refresh_reminder_sent_at' })
  @Exclude()
  last_listing_refresh_reminder_sent_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Listing, (listing) => listing.user)
  listings!: Listing[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites!: Favorite[];

  getDisplayName(): string {
    if (this.type === 'Business' && this.companyName?.trim()) {
      return this.companyName.trim();
    }
    if (this.firstName?.trim()) {
      return this.firstName.trim();
    }
    return this.phone ?? '';
  }

  canCreateListing(activeCount: number, limit: number): boolean {
    return activeCount < limit;
  }

  deactivate(): void {
    this.email = null;
    this.phone = null;
    this.additionalPhone = null;
    this.firstName = null;
    this.lastName = null;
    this.companyName = null;
    this.companyWebsiteUrl = null;
    this.googleId = null;
    this.telegramId = null;
    this.telegramUsername = null;
    this.active = false;
  }

  isAdmin(): boolean {
    return this.type === 'Admin';
  }

  setPlatformPartner(isPartner: boolean): void {
    if (isPartner && this.type !== constants.UserType.Business) {
      throw new Error('errors.partnerSettingsBusinessOnly');
    }
    this.isPlatformPartner = isPartner;
    if (!isPartner) {
      this.freePromotionBalance = 0;
      this.partnerListingProgress = 0;
    }
  }

  setFreePromotionBalance(balance: number): void {
    this.freePromotionBalance = Math.max(0, Math.trunc(balance));
  }

  registerPartnerListingCreation(): {
    awardedPromotions: number;
    freePromotionBalance: number;
    partnerListingProgress: number;
  } {
    if (!this.isPlatformPartner || this.type !== constants.UserType.Business) {
      return {
        awardedPromotions: 0,
        freePromotionBalance: this.freePromotionBalance,
        partnerListingProgress: this.partnerListingProgress,
      };
    }

    const nextProgress = this.partnerListingProgress + 1;
    const awardedPromotions = Math.floor(nextProgress / 20);
    this.partnerListingProgress = nextProgress % 20;

    if (awardedPromotions > 0) {
      this.freePromotionBalance += awardedPromotions;
    }

    return {
      awardedPromotions,
      freePromotionBalance: this.freePromotionBalance,
      partnerListingProgress: this.partnerListingProgress,
    };
  }

  consumeFreePromotion(): void {
    if (this.freePromotionBalance <= 0) {
      throw new Error('errors.partnerPromotionBalanceEmpty');
    }
    this.freePromotionBalance -= 1;
  }
}
