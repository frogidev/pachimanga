import type { ReactNode } from "react";

export function PageHeading({
  title,
  subtitle,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  const desc = subtitle || description;
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-pink-400">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {desc ? <p className="mt-1.5 text-sm text-zinc-500">{desc}</p> : null}
      </div>
      {actions}
    </header>
  );
}
