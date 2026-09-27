import type { DemoUser } from '../domain/auth';

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'company-lotte',
    name: '롯데면세점 CX 담당자',
    role: 'company',
    companyId: 'company-롯데면세점',
    projectIds: ['project-dutyfree-2022'],
  },
  {
    id: 'consultant-dutyfree',
    name: '면세점 담당 컨설턴트',
    role: 'consultant',
    projectIds: ['project-dutyfree-2022'],
  },
  {
    id: 'admin-kpc',
    name: 'KPC 시스템 관리자',
    role: 'admin',
    projectIds: [],
  },
];

export function findDemoUser(userId: string): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.id === userId);
}

export function getHomePath(role: DemoUser['role']): string {
  return role === 'admin' ? '/admin' : '/workspace/overview/all';
}
