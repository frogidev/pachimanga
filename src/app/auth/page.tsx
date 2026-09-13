import { AuthForm } from '@/components/AuthForm';
import { PageHeading } from '@/components/page-heading';
import { PachiMascot } from '@/components/pachi-mascot';

export default function AuthPage() {
  return (
    <div className="app-page max-w-3xl">
      <div className="grid gap-6 md:grid-cols-[1fr_360px] md:items-start">
        <div>
          <PageHeading eyebrow="Account" title="Welcome to Pachimanga" description="Create an account to sync your library and reading progress across your devices. Local reading remains available without an account." />
          <div className="mt-6 hidden rounded-2xl border border-pink-300/10 bg-gradient-to-br from-pink-400/[.07] to-transparent p-5 md:flex md:items-center md:gap-4">
            <PachiMascot className="h-24 w-28 shrink-0" />
            <div>
              <h2 className="font-semibold text-zinc-200">Local-first by default</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">Sign in only when you want private cloud sync. Your reader still works on-device without it.</p>
            </div>
          </div>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
