export type UserRole = 'company' | 'consultant' | 'admin';

export interface DemoUser {
  id: string;
  name: string;
  role: UserRole;
  companyId?: string;
  projectIds: string[];
}

export type AccountStatus = 'active' | 'inactive';
export interface ManagedAccount extends Omit<DemoUser, 'companyId'> {
  email: string;
  status: AccountStatus;
  companyId: string | null;
  assignedProjectIds: string[];
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
