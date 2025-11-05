import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import * as constants from '../../common/constants';
import { UserType } from '../../common/types';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { Listing } from '../../listings/entities/listing.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: constants.userTypes,
    default: constants.userTypes[0],
  })
  type: UserType;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  companyName: string;

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
  emailVerified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Listing, (listing) => listing.user)
  listings: Listing[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];
}
