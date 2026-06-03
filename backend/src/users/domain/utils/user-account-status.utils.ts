type SelfDeletedUserShape = {
  active: boolean;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
};

export function isSelfDeletedUser(user: SelfDeletedUserShape): boolean {
  if (user.active) {
    return false;
  }
  return !user.firstName && !user.lastName && !user.companyName && !user.email && !user.phone;
}
