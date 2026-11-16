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
  email: string | null;
  role: Role;
};

type RoleContextValue = {
  role: Role | null;
  profile: Profile | null;
  profileChecked: boolean;
  deviceId: string;
  setRole: (r: Role | null) => void;
  clearRole: () => void;
  refreshProfile: () => Promise<void>;
  createRecipientProfile: (name: string, email: string) => Promise<void>;
  profileError: string | null;
  loading: boolean;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const ROLE_KEY = 'remita.role';
const DEVICE_KEY = 'remita.device_id';
const PROFILE_KEY = 'remita.profile';

function getRoleDeviceId(deviceId: string, role: Role) {
  return `${deviceId}:${role}`;
}

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

async function findProfile(deviceId: string, role: Role): Promise<Profile | null> {
  const { data: roleProfile, error: roleError } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', getRoleDeviceId(deviceId, role))
    .eq('role', role)
    .maybeSingle();
  if (roleError) throw new Error(roleError.message);
  if (roleProfile) return roleProfile as Profile;

  // Keep profiles created before role-scoped device IDs attached to their role.
  const { data: legacyProfile, error: legacyError } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .eq('role', role)
    .maybeSingle();
  if (legacyError) throw new Error(legacyError.message);
  return (legacyProfile as Profile) ?? null;
}

async function ensureSenderProfile(deviceId: string): Promise<Profile> {
  const existing = await findProfile(deviceId, 'sender');
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      device_id: getRoleDeviceId(deviceId, 'sender'),
      display_name: 'Overseas Worker',
      role: 'sender',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

function persistProfile(profile: Profile | null) {
  try {
    if (profile) {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } else {
      window.localStorage.removeItem(PROFILE_KEY);
    }
  } catch {
    // ignore
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
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
        const cachedProfile = JSON.parse(storedProfile) as Profile;
        if (cachedProfile.role === storedRole) {
          setProfile(cachedProfile);
        } else {
          window.localStorage.removeItem(PROFILE_KEY);
        }
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
      const p =
        r === 'sender'
          ? await ensureSenderProfile(did)
          : await findProfile(did, 'recipient');
      setProfile(p);
      persistProfile(p);
      setProfileChecked(true);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Could not load your profile.'
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
        setProfile(null);
        setProfileChecked(false);
        await loadProfile(deviceId, r);
      } else if (!r) {
        setProfile(null);
        setProfileChecked(false);
        persistProfile(null);
      }
    },
    [deviceId, loadProfile]
  );

  useEffect(() => {
    if (hydrated && deviceId && role && !profile && !profileChecked) {
      loadProfile(deviceId, role);
    }
  }, [hydrated, deviceId, role, profile, profileChecked, loadProfile]);

  const clearRole = useCallback(() => setRole(null), [setRole]);

  const refreshProfile = useCallback(async () => {
    if (!deviceId || !role) return;
    await loadProfile(deviceId, role);
  }, [deviceId, role, loadProfile]);

  const createRecipientProfile = useCallback(
    async (name: string, email: string) => {
      if (!deviceId) throw new Error('Your device is not ready yet. Please try again.');
      const existing = await findProfile(deviceId, 'recipient');
      if (existing) {
        setProfile(existing);
        setProfileChecked(true);
        persistProfile(existing);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          device_id: getRoleDeviceId(deviceId, 'recipient'),
          display_name: name,
          email,
          role: 'recipient',
        })
        .select('*')
        .single();
      if (error) {
        const concurrentProfile = await findProfile(deviceId, 'recipient');
        if (concurrentProfile) {
          setProfile(concurrentProfile);
          setProfileChecked(true);
          persistProfile(concurrentProfile);
          return;
        }
        throw new Error(error.message);
      }
      const p = data as Profile;
      setProfile(p);
      setProfileChecked(true);
      persistProfile(p);
    },
    [deviceId]
  );

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-white" aria-hidden>
        <div className="h-px" />
      </div>
    );
  }

  return (
    <RoleContext.Provider
      value={{
        role,
        profile,
        profileChecked,
        deviceId,
        setRole,
        clearRole,
        refreshProfile,
        createRecipientProfile,
        profileError,
        loading,
      }}
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
