"use client";

import { en } from "./i18n/en";
import { es } from "./i18n/es";
import type { Dictionary } from "./i18n/types";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type Locale = "en" | "es";
/** Which manga language Browse shows. "all" disables the filter. */
export type ContentLanguage = Locale | "all";

const LOCALE_KEY = "pachimanga-locale";
const CONTENT_KEY = "pachimanga-content-language";

const translations: Record<Locale, Dictionary> = { en, es };

function interpolate(text: string, vars?: Record<string, string | number>) {
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match)) : text;
}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored && (allowed as readonly string[]).includes(stored)) return stored as T;
  } catch {}
  return fallback;
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  contentLanguage: ContentLanguage;
  setContentLanguage: (language: ContentLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

// Preferences live in localStorage; useSyncExternalStore serves the English default during
// SSR/hydration and then switches to the stored value without a hydration mismatch.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const getLocale = () => readStored<Locale>(LOCALE_KEY, ["en", "es"], "en");
const getContentLanguage = () => readStored<ContentLanguage>(CONTENT_KEY, ["en", "es", "all"], getLocale());

function store(key: string, value: string) {
  writeStored(key, value);
  listeners.forEach((listener) => listener());
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocale, () => "en" as Locale);
  const contentLanguage = useSyncExternalStore(subscribe, getContentLanguage, () => "en" as ContentLanguage);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextType>(() => ({
    locale,
    setLocale: (next) => store(LOCALE_KEY, next),
    contentLanguage,
    setContentLanguage: (next) => store(CONTENT_KEY, next),
    t: (key, vars) => interpolate(translations[locale][key] ?? en[key] ?? key, vars),
  }), [locale, contentLanguage]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within a LocaleProvider");
  return context;
}
