import { authApi } from '@/lib/api';
import type { User } from '@/lib/api';
import {
  clearGuestPartnerPromoDismissed,
  readGuestPartnerPromoDismissed,
} from '@/lib/partner-promo-dismiss-storage';

export async function syncPartnerPromoDismissAfterAuth(user: User): Promise<User> {
  if (!readGuestPartnerPromoDismissed()) {
    return user;
  }
  if (user.hidePartnerPromoBanner) {
    clearGuestPartnerPromoDismissed();
    return user;
  }
  try {
    const { data } = await authApi.dismissPartnerPromoBanner();
    clearGuestPartnerPromoDismissed();
    return data;
  } catch {
    return user;
  }
}
