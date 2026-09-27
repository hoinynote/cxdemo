import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { UserRole } from '../domain/auth';
import { getHomePath } from './demo-users';
import { useSession } from './SessionProvider';

export function RequireRole({ allow, children }: { allow: UserRole[]; children: ReactElement }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={getHomePath(user.role)} replace />;
  return children;
}
