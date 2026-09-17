'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { classifyProviderError, type ProviderErrorInfo } from '@/lib/source/provider-error';

export function ProviderFailure({
  info,
  backHref = '/',
  backLabel = 'Back to library',
}: {
  info: ProviderErrorInfo;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const timer = window.setTimeout(update, 0);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const display = offline ? classifyProviderError(null, { offline: true }) : info;

  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 py-12 text-center">
      <div className="surface-card max-w-md p-6 sm:p-8">
        <p className="pixel-kicker text-[9px] text-amber-300">Provider status</p>
        <h1 className="mt-2 text-xl font-bold tracking-[-.03em] text-zinc-100">{display.title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{display.message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {display.retryable ? (
            <button
              type="button"
              onClick={() => router.refresh()}
              disabled={offline}
              className="button-primary px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {offline ? 'Reconnect to retry' : 'Retry'}
            </button>
          ) : null}
          <Link href={backHref} className="button-secondary px-5 py-2.5 text-sm">{backLabel}</Link>
        </div>
      </div>
    </div>
  );
}
