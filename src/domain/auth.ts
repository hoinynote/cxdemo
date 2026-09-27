export type UserRole = 'company' | 'consultant' | 'admin';

export interface DemoUser {
  id: string;
  name: string;
  role: UserRole;
  companyId?: string;
  projectIds: string[];
}

export interface AccessScope {
  role: UserRole;
  visibleCompanyIds: string[];
  visibleProjectIds: string[];
}

export interface SessionContextValue {
  user: DemoUser | null;
  signIn(userId: string): void;
  signOut(): void;
}
