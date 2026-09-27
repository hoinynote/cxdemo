import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireRole } from './auth/RequireRole';
import { SessionProvider, useSession } from './auth/SessionProvider';
import { getHomePath } from './auth/demo-users';
import { AdminLayout } from './layouts/AdminLayout';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { AdminPage, WorkspacePage } from './pages/PortalPages';
import { SignInPage } from './pages/SignInPage';
import { AnalysisProvider } from './state/AnalysisContext';
import type { ReactElement } from 'react';

function HomeRedirect() {
  const { user } = useSession();
  return <Navigate to={user ? getHomePath(user.role) : '/login'} replace />;
}

function WorkspaceRoutes() {
  return (
    <RequireRole allow={['company', 'consultant']}>
      <AnalysisProvider>
        <WorkspaceLayout />
      </AnalysisProvider>
    </RequireRole>
  );
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
        <Route path="/workspace" element={<WorkspaceRoutes />}>
          <Route index element={<Navigate to="analysis/overall" replace />} />
          <Route path="analysis/overall" element={<WorkspacePage />} />
          <Route path="analysis/industry" element={<WorkspacePage />} />
          <Route path="analysis/company" element={<WorkspacePage />} />
          <Route path="factors/company" element={<WorkspacePage />} />
          <Route path="factors/customer-group" element={<WorkspacePage />} />
          <Route path="factors/industry-compare" element={<WorkspacePage />} />
          <Route path="consulting" element={<ConsultantOnly><WorkspacePage /></ConsultantOnly>} />
          <Route path="diagnostics" element={<ConsultantOnly><WorkspacePage /></ConsultantOnly>} />
          <Route path="*" element={<Navigate to="analysis/overall" replace />} />
        </Route>
        <Route path="/admin" element={<RequireRole allow={['admin']}><AdminLayout /></RequireRole>}>
          <Route index element={<AdminPage />} />
          <Route path="users" element={<AdminPage />} />
          <Route path="projects" element={<AdminPage />} />
          <Route path="data" element={<AdminPage />} />
          <Route path="settings" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </SessionProvider>
  );
}
