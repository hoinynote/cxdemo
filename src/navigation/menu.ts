import type { UserRole } from '../domain/auth';

export interface MenuItem {
  label: string;
  path: string;
  roles: UserRole[];
  children?: MenuItem[];
}

const analysisRoles: UserRole[] = ['company', 'consultant'];
const consultantOnly: UserRole[] = ['consultant'];

export const workspaceMenu: MenuItem[] = [
  {
    label: '전체 수준 분석',
    path: '/workspace/overview/all',
    roles: analysisRoles,
    children: [
      { label: '전체 수준 분석', path: '/workspace/overview/all', roles: analysisRoles },
      { label: '산업별 수준 분석', path: '/workspace/overview/industry', roles: analysisRoles },
      { label: '기업별 수준 분석', path: '/workspace/overview/company', roles: analysisRoles },
    ],
  },
  {
    label: 'CS 품질요인',
    path: '/workspace/factors/company',
    roles: analysisRoles,
    children: [
      { label: '기업별 수준 분석', path: '/workspace/factors/company', roles: analysisRoles },
      { label: '고객군별 수준 분석', path: '/workspace/factors/customers', roles: analysisRoles },
      { label: '업종별 기업 비교 분석', path: '/workspace/factors/industry-comparison', roles: analysisRoles },
    ],
  },
  { label: '컨설팅 업무', path: '/workspace/consulting/projects', roles: consultantOnly },
  { label: '진단보고서 검토', path: '/workspace/diagnostics', roles: consultantOnly },
];

export const adminMenu: MenuItem[] = [
  { label: '운영 현황', path: '/admin', roles: ['admin'] },
  { label: '사용자 및 권한', path: '/admin/users', roles: ['admin'] },
  { label: '프로젝트 관리', path: '/admin/projects', roles: ['admin'] },
  { label: '데이터 관리', path: '/admin/data', roles: ['admin'] },
  { label: '보고서 템플릿', path: '/admin/templates', roles: ['admin'] },
  { label: 'AI 사용 및 품질', path: '/admin/ai-quality', roles: ['admin'] },
];
