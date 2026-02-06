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
@Index(['board_slug'], { unique: true, where: '"board_slug" IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: constants.userTypes,
    default: constants.userTypes[0],
  })
  type: UserType;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

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

  @Column({ type: 'boolean', default: false })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  viber: boolean;

  @Column({ type: 'boolean', default: false })
  whatsapp: boolean;

  @Column({ type: 'boolean', default: false })
  telegram: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'boolean', nullable: true })
  emailVerified: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  registration_ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  last_login_ip: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_listing_refresh_at' })
  last_listing_refresh_at: Date | null;

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
    this.firstName = null;
    this.lastName = null;
    this.companyName = null;
    this.companyWebsiteUrl = null;
    this.active = false;
  }

  isAdmin(): boolean {
    return this.type === 'Admin';
  }
}
