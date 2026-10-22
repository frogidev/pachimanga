"use client";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (value: T) => void;
};

/** Small accessible single-choice control (radio group) with 40px touch targets. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-xl border border-white/[.08] bg-[#0d0c12] p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-[9px] px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70 ${
              active ? "bg-pink-400 font-semibold text-[#2a1503]" : "text-zinc-400 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
