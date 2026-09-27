import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';

const ConsultantQueuePage = lazy(() => import('./pages/ConsultantQueuePage').then((module) => ({ default: module.ConsultantQueuePage })));
const ProjectWorkspacePage = lazy(() => import('./pages/ProjectWorkspacePage').then((module) => ({ default: module.ProjectWorkspacePage })));
const loading = <div className="route-loading">프로젝트 정보를 불러오는 중입니다.</div>;

export const consultantRoutes: RouteObject[] = [
  { path: 'consulting/projects', element: <Suspense fallback={loading}><ConsultantQueuePage /></Suspense> },
  { path: 'consulting/projects/:projectId', element: <Suspense fallback={loading}><ProjectWorkspacePage /></Suspense> },
];
