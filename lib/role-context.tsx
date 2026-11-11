'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';

export type Role = 'recipient' | 'sender';

export type Profile = {
  id: string;
  device_id: string;
  display_name: string;
  role: Role;
};

type RoleContextValue = {
  role: Role | null;
  profile: Profile | null;
  deviceId: string;
  setRole: (r: Role | null) => void;
  clearRole: () => void;
  refreshProfile: () => Promise<void>;
  profileError: string | null;
  loading: boolean;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const ROLE_KEY = 'remita.role';
const DEVICE_KEY = 'remita.device_id';
const PROFILE_KEY = 'remita.profile';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'dev-fallback';
  }
}

async function ensureProfile(
  deviceId: string,
  role: Role
): Promise<Profile> {
  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) {
    return existing as Profile;
  }

  // Create a new profile
  const defaultName =
    role === 'sender' ? 'Overseas Worker' : 'Santos Family';
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      device_id: deviceId,
      display_name: defaultName,
      role,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const did = getOrCreateDeviceId();
    setDeviceId(did);
    try {
      const storedRole = window.localStorage.getItem(ROLE_KEY);
      const storedProfile = window.localStorage.getItem(PROFILE_KEY);
      if (storedRole === 'recipient' || storedRole === 'sender') {
        setRoleState(storedRole);
      }
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
    setLoading(false);
  }, []);

  const loadProfile = useCallback(async (did: string, r: Role) => {
    setProfileError(null);
    try {
      const p = await ensureProfile(did, r);
      setProfile(p);
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      } catch {
        // ignore
      }
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Could not set up your profile.'
      );
    }
  }, []);

  const setRole = useCallback(
    async (r: Role | null) => {
      setRoleState(r);
      try {
        if (r) {
          window.localStorage.setItem(ROLE_KEY, r);
        } else {
          window.localStorage.removeItem(ROLE_KEY);
        }
      } catch {
        // ignore
      }

      if (r && deviceId) {
        await loadProfile(deviceId, r);
      } else if (!r) {
        setProfile(null);
        try {
          window.localStorage.removeItem(PROFILE_KEY);
        } catch {
          // ignore
        }
      }
    },
    [deviceId, loadProfile]
  );

  useEffect(() => {
    if (hydrated && deviceId && role && !profile) {
      loadProfile(deviceId, role);
    }
  }, [hydrated, deviceId, role, profile, loadProfile]);

  const clearRole = useCallback(() => setRole(null), [setRole]);

  const refreshProfile = useCallback(async () => {
    if (!deviceId || !role) return;
    await loadProfile(deviceId, role);
  }, [deviceId, role, loadProfile]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-white" aria-hidden>
        <div className="h-px" />
      </div>
    );
  }

  return (
    <RoleContext.Provider
      value={{ role, profile, deviceId, setRole, clearRole, refreshProfile, profileError, loading }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
