export type UserRole = 'admin' | 'operator';

export type UserProfile = {
  email: string;
  role: UserRole;
  updatedAt: string;
};
