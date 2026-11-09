'use client';

import { useRole, Role } from '@/lib/role-context';
import { Home, Plane, ArrowRight } from 'lucide-react';

export function RoleSelect() {
  const { setRole } = useRole();

  const choose = (r: Role) => setRole(r);

  return (
    <main className="min-h-screen bg-white">
      {/* Top rule + masthead */}
      <div className="border-b border-black">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center">
          <div className="gold-bar mx-auto mb-8 h-px w-16" />
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            REMITA
          </h1>
          <p className="editorial-label mt-4">
            Cross-Border Bill Payment on the Stellar Network
          </p>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Pay family utility bills directly with stablecoins. No wire fees,
            no middlemen, no waiting — just settled bills, on-chain.
          </p>
        </div>
      </div>

      {/* Rule-separated role options */}
      <section className="mx-auto max-w-6xl">
        <div className="px-6 py-10">
          <p className="editorial-label">Choose your role to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Recipient */}
          <button
            onClick={() => choose('recipient')}
            className="group flex flex-col justify-between border-b border-black px-8 py-12 text-left transition-colors hover:bg-black hover:text-white md:border-r md:border-b-0"
          >
            <div>
              <div className="flex items-center gap-4">
                <Home className="h-7 w-7" />
                <span className="editorial-label">Role 01</span>
              </div>
              <h2 className="mt-6 text-3xl font-bold">
                Family Member
              </h2>
              <p className="mt-1 text-sm uppercase tracking-[0.18em] text-muted-foreground group-hover:text-white/60">
                Recipient
              </p>
              <p className="mt-6 max-w-sm text-base leading-relaxed">
                Upload utility bills for your household — biller name, account
                number, amount due — and track each one from Pending to Paid.
              </p>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm uppercase tracking-[0.18em]">
              <span>Enter recipient view</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
            </div>
          </button>

          {/* Sender */}
          <button
            onClick={() => choose('sender')}
            className="group flex flex-col justify-between px-8 py-12 text-left transition-colors hover:bg-black hover:text-white"
          >
            <div>
              <div className="flex items-center gap-4">
                <Plane className="h-7 w-7" />
                <span className="editorial-label">Role 02</span>
              </div>
              <h2 className="mt-6 text-3xl font-bold">
                Overseas Worker
              </h2>
              <p className="mt-1 text-sm uppercase tracking-[0.18em] text-muted-foreground group-hover:text-white/60">
                Sender
              </p>
              <p className="mt-6 max-w-sm text-base leading-relaxed">
                See every bill your family has uploaded and pay it with USDC.
                A Stellar path payment routes local currency to the payout
                anchor — settled in seconds.
              </p>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm uppercase tracking-[0.18em]">
              <span>Enter sender view</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
            </div>
          </button>
        </div>

        <div className="gold-bar h-px w-full" />
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center">
        <p className="editorial-label">
          Testnet demo · No real funds are moved · Powered by Stellar
        </p>
      </footer>
    </main>
  );
}
