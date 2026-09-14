import { AuthForm } from '@/components/AuthForm';
import { PachiLogo } from '@/components/pachi-logo';
import { PachiMascot } from '@/components/pachi-mascot';

export default function AuthPage() {
  return (
    <div className="min-h-dvh bg-[#09080d] px-4 py-8 text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex justify-center sm:justify-start">
          <PachiLogo />
        </div>
        <div className="grid gap-6 md:grid-cols-[1fr_380px] md:items-start">
          <section className="rounded-3xl border border-pink-300/12 bg-gradient-to-br from-pink-400/[.08] via-[#111019] to-[#0d0c12] p-6 sm:p-8">
            <p className="pixel-kicker text-[9px] text-pink-400">Private manga library</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-.045em] text-white sm:text-4xl">Sign in to Pachimanga</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">An account is required. Your manga library, imports, reader preferences and reading progress are kept under your own account.</p>
            <div className="mt-7 flex items-center gap-4 rounded-2xl border border-white/[.07] bg-black/15 p-4">
              <PachiMascot className="h-24 w-28 shrink-0" />
              <div>
                <h2 className="font-semibold text-zinc-200">No guest or demo mode</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">Register once, then use the same account from the PWA, browser or native app.</p>
              </div>
            </div>
          </section>
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
