'use client';

import { RoleProvider, useRole } from '@/lib/role-context';
import { RoleSelect } from '@/components/role-select';
import { AppHeader } from '@/components/app-header';
import { RecipientDashboard } from '@/components/recipient-dashboard';
import { SenderDashboard } from '@/components/sender-dashboard';

function AppShell() {
  const { role } = useRole();

  if (!role) {
    return <RoleSelect />;
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      {role === 'recipient' ? <RecipientDashboard /> : <SenderDashboard />}
    </div>
  );
}

export default function Home() {
  return (
    <RoleProvider>
      <AppShell />
    </RoleProvider>
  );
}
