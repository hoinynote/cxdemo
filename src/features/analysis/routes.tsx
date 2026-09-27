import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';

const CompanyAnalysisPage = lazy(() => import('./pages/CompanyAnalysisPage').then((module) => ({ default: module.CompanyAnalysisPage })));
const CustomerSegmentsPage = lazy(() => import('./pages/CustomerSegmentsPage').then((module) => ({ default: module.CustomerSegmentsPage })));
const IndustryAnalysisPage = lazy(() => import('./pages/IndustryAnalysisPage').then((module) => ({ default: module.IndustryAnalysisPage })));
const IndustryCompanyComparisonPage = lazy(() => import('./pages/IndustryCompanyComparisonPage').then((module) => ({ default: module.IndustryCompanyComparisonPage })));
const OverallAnalysisPage = lazy(() => import('./pages/OverallAnalysisPage').then((module) => ({ default: module.OverallAnalysisPage })));

const loading = <div className="route-loading">분석 화면을 불러오는 중입니다.</div>;

export const analysisRoutes: RouteObject[] = [
  { path: 'overview/all', element: <Suspense fallback={loading}><OverallAnalysisPage /></Suspense> },
  { path: 'overview/industry', element: <Suspense fallback={loading}><IndustryAnalysisPage /></Suspense> },
  { path: 'overview/company', element: <Suspense fallback={loading}><CompanyAnalysisPage /></Suspense> },
  { path: 'factors/company', element: <Suspense fallback={loading}><CompanyAnalysisPage /></Suspense> },
  { path: 'factors/customers', element: <Suspense fallback={loading}><CustomerSegmentsPage /></Suspense> },
  { path: 'factors/industry-comparison', element: <Suspense fallback={loading}><IndustryCompanyComparisonPage /></Suspense> },
];
