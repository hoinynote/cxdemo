import type { DemoUser } from '../domain/auth';
import { AdminDemoStore, listEnabledDemoUsers } from '../data/admin-demo-store';
export { DEMO_USERS } from '../data/demo-users';

export function findDemoUser(userId: string): DemoUser | undefined {
  const account = AdminDemoStore.getAccount(userId);
  if (!account || account.status !== 'active') return undefined;
  const { id, name, role, companyId, projectIds } = account;
  return { id, name, role, ...(companyId ? { companyId } : {}), projectIds };
}

export function listSignInUsers(): DemoUser[] { return listEnabledDemoUsers(); }

export function getHomePath(role: DemoUser['role']): string {
  return role === 'admin' ? '/admin' : '/workspace/overview/all';
}
