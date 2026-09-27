import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireRole } from './auth/RequireRole';
import { SessionProvider, useSession } from './auth/SessionProvider';
import { getHomePath } from './auth/demo-users';
import { SignInPage } from './pages/SignInPage';
import { analysisRoutes } from './features/analysis/routes';
import { consultantRoutes } from './features/consultant/routes';

const WorkspaceShell = lazy(() => import('./layouts/WorkspaceShell'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminPage = lazy(() => import('./pages/PortalPages').then((module) => ({ default: module.AdminPage })));
const CustomerReportComposer = lazy(() => import('./features/customer-report/CustomerReportComposer').then((module) => ({ default: module.CustomerReportComposer })));

function HomeRedirect() {
  const { user } = useSession();
  return <Navigate to={user ? getHomePath(user.role) : '/login'} replace />;
}

function ConsultantOnly({ children }: { children: ReactElement }) {
  return <RequireRole allow={['consultant']}>{children}</RequireRole>;
}

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/workspace" element={<RequireRole allow={['company', 'consultant']}><Suspense fallback={<div className="route-loading">분석 포털을 불러오는 중입니다.</div>}><WorkspaceShell /></Suspense></RequireRole>}>
          <Route index element={<Navigate to="overview/all" replace />} />
          {analysisRoutes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}
          {consultantRoutes.map((route) => <Route key={route.path} path={route.path} element={<ConsultantOnly>{route.element as ReactElement}</ConsultantOnly>} />)}
          <Route path="report" element={<Suspense fallback={<div className="route-loading">리포트 화면을 불러오는 중입니다.</div>}><CustomerReportComposer /></Suspense>} />
          <Route path="*" element={<Navigate to="overview/all" replace />} />
        </Route>
        <Route path="/admin" element={<RequireRole allow={['admin']}><Suspense fallback={<div className="route-loading">관리 포털을 불러오는 중입니다.</div>}><AdminLayout /></Suspense></RequireRole>}>
          <Route index element={<Suspense fallback={null}><AdminPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
          <Route path="projects" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
          <Route path="data" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </SessionProvider>
  );
}
