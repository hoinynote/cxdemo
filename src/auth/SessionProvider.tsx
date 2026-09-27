import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { findDemoUser } from './demo-users';
import type { DemoUser, SessionContextValue } from '../domain/auth';

const SESSION_KEY = 'kpc-cx-demo-session';
const SessionContext = createContext<SessionContextValue | null>(null);

function readSession(): DemoUser | null {
  try {
    const userId = window.sessionStorage.getItem(SESSION_KEY);
    return userId ? findDemoUser(userId) ?? null : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(readSession);
  const value = useMemo<SessionContextValue>(() => ({
    user,
    signIn(userId) {
      const nextUser = findDemoUser(userId);
      if (!nextUser) return;
      try {
        window.sessionStorage.setItem(SESSION_KEY, nextUser.id);
      } catch {
        // The in-memory session remains usable when browser storage is unavailable.
      }
      setUser(nextUser);
    },
    signOut() {
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // Clear the in-memory session even if browser storage is unavailable.
      }
      setUser(null);
    },
  }), [user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider.');
  return value;
}
