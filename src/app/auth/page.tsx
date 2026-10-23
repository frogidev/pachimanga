import { AuthForm } from '@/components/AuthForm';
import { AuthIntro } from '@/components/auth-intro';
import { PachiLogo } from '@/components/pachi-logo';

export default function AuthPage() {
  return (
    <div className="min-h-dvh bg-[#09080d] px-4 py-8 text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex justify-center sm:justify-start">
          <PachiLogo />
        </div>
        <div className="grid gap-6 md:grid-cols-[1fr_380px] md:items-start">
          <AuthIntro />
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
