'use client';

import { useRole } from '@/lib/role-context';
import { ArrowLeftRight, LogOut } from 'lucide-react';

export function AppHeader() {
  const { role, clearRole } = useRole();

  return (
    <header className="border-b border-black bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight">
            REMITA
          </span>
          <span className="gold-text editorial-label hidden sm:inline">
            Stellar Bill Pay
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="editorial-label">Active role</span>
            <span
              className={`border px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                role === 'sender'
                  ? 'ink'
                  : 'border-black bg-white text-black'
              }`}
            >
              {role === 'sender' ? 'Sender' : 'Recipient'}
            </span>
          </div>

          <button
            onClick={clearRole}
            className="group flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-black transition-colors hover:text-[hsl(45_70%_44%)]"
            aria-label="Switch role"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Switch</span>
            <LogOut className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
          </button>
        </div>
      </div>
      <div className="gold-bar h-px w-full" />
    </header>
  );
}
