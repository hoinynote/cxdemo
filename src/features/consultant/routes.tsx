import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';

const ConsultantQueuePage = lazy(() => import('./pages/ConsultantQueuePage').then((module) => ({ default: module.ConsultantQueuePage })));
const ProjectWorkspacePage = lazy(() => import('./pages/ProjectWorkspacePage').then((module) => ({ default: module.ProjectWorkspacePage })));
const ConsultantReportReviewPage = lazy(() => import('../diagnostic-report/pages/ConsultantReportReviewPage').then((module) => ({ default: module.ConsultantReportReviewPage })));
const loading = <div className="route-loading">프로젝트 정보를 불러오는 중입니다.</div>;

export const consultantRoutes: RouteObject[] = [
  { path: 'consulting/projects', element: <Suspense fallback={loading}><ConsultantQueuePage /></Suspense> },
  { path: 'consulting/projects/:projectId', element: <Suspense fallback={loading}><ProjectWorkspacePage /></Suspense> },
  { path: 'consulting/projects/:projectId/report', element: <Suspense fallback={loading}><ConsultantReportReviewPage /></Suspense> },
  { path: 'diagnostics', element: <Suspense fallback={loading}><ConsultantReportReviewPage /></Suspense> },
  { path: 'diagnostics/:projectId', element: <Suspense fallback={loading}><ConsultantReportReviewPage /></Suspense> },
];
