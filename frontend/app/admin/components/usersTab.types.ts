export type UsersRoleFilter = 'Individual' | 'Business' | 'Admin';
export type UsersActivityFilter = 'All' | 'Active' | 'Inactive';

export interface UsersFilters {
  searchQuery: string;
  roleFilter: UsersRoleFilter;
  activityFilter: UsersActivityFilter;
}

export interface UsersTabProps {
  isActive: boolean;
  onViewUserListings: (_userId: string) => void;
}

export const USER_ROLE_FILTERS: readonly UsersRoleFilter[] = ['Individual', 'Business', 'Admin'];
