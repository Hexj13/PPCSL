import type { User } from '../../users/entities/user.entity';

type UserMethodKeys =
  | 'getDisplayName'
  | 'canCreateListing'
  | 'deactivate'
  | 'isAdmin'
  | 'setPlatformPartner'
  | 'setFreePromotionBalance'
  | 'registerPartnerListingCreation'
  | 'consumeFreePromotion';

type UserDataKeys = Exclude<keyof User, UserMethodKeys>;

export type UserWithoutPassword = Omit<Pick<User, UserDataKeys>, 'password'>;

export type RegisterResponse = UserWithoutPassword & {
  emailVerificationSent: boolean;
};

export type UserProfileResponse = Omit<UserWithoutPassword, 'board_slug'> & {
  boardSlug: string | null;
  hasPassword: boolean;
  emailVerificationSent?: boolean;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string | null;
    type: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    companyWebsiteUrl: string | null;
    phone: string | null;
    boardSlug: string | null;
    preferredLocale: string | null;
    hidePartnerPromoBanner: boolean;
    isPlatformPartner: boolean;
    phoneVerified: boolean;
  };
};

export type GoogleSignInResponse = LoginResponse & {
  requiresPhoneVerification: boolean;
  isNewUser: boolean;
};

export type TelegramSignInResponse = LoginResponse & {
  requiresPhoneVerification: boolean;
  isNewUser: boolean;
};
