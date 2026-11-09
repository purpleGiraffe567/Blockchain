'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';

export type Role = 'recipient' | 'sender';

type RoleContextValue = {
  role: Role | null;
  setRole: (r: Role | null) => void;
  clearRole: () => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = 'remita.role';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'recipient' || stored === 'sender') {
        setRoleState(stored);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const setRole = useCallback((r: Role | null) => {
    setRoleState(r);
    try {
      if (r) window.localStorage.setItem(STORAGE_KEY, r);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const clearRole = useCallback(() => setRole(null), [setRole]);

  // Avoid a flash of the wrong screen before localStorage is read.
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-white" aria-hidden>
        <div className="h-px" />
      </div>
    );
  }

  return (
    <RoleContext.Provider value={{ role, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
