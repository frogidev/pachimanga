"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type Locale = "en" | "es";
/** Which manga language Browse shows. "all" disables the filter. */
export type ContentLanguage = Locale | "all";

const LOCALE_KEY = "pachimanga-locale";
const CONTENT_KEY = "pachimanga-content-language";

type Dictionary = Record<string, string>;

const en: Dictionary = {
  "nav.library": "Library",
  "nav.browse": "Browse",
  "nav.updates": "Updates",
  "nav.history": "History",
  "nav.import": "Import",
  "nav.archive": "Archive",
  "nav.settings": "Settings",

  "settings.kicker": "Preferences",
  "settings.title": "Settings",
  "settings.subtitle": "Your account, reading experience and device in one place.",
  "settings.theme": "Theme",
  "settings.theme.desc": "Switch between the dark room and the warm-paper light theme.",
  "settings.reader.title": "Reading",
  "settings.reader.desc": "Comfortable defaults for long chapters. These sync to your account.",
  "settings.reader.preset": "Default reading preset",
  "settings.reader.preset.manga": "Manga · fit screen",
  "settings.reader.preset.webtoon": "Webtoon · fit width",
  "settings.reader.preload": "Pages to preload",
  "settings.reader.speed": "Base auto-scroll speed",
  "settings.reader.fit": "Default fit",
  "settings.reader.fit.width": "Fit width",
  "settings.reader.fit.screen": "Fit screen",
  "settings.reader.awake": "Keep screen awake while reading",
  "settings.reader.awake.desc": "Uses the Screen Wake Lock API when your browser supports it.",
  "settings.language.title": "Language",
  "settings.language.desc": "Choose the app language and which manga you want to find.",
  "settings.language.ui": "Interface language",
  "settings.language.content": "Manga language",
  "settings.language.content.hint": "Spanish manga comes from extensions. Install one under Advanced.",
  "settings.language.all": "All languages",
  "settings.group.device": "This device",
  "settings.group.account": "Your account and data",
  "settings.advanced": "Advanced",
  "settings.advanced.desc": "Extensions and diagnostics. Most people never need these.",

  "offline.title": "Saved chapters",
  "offline.desc": "Chapters you saved on this device. Cached images never leave it.",
  "offline.empty": "No chapters are saved offline on this device.",
  "offline.pages": "pages",
  "offline.retry": "Retry",
  "offline.remove": "Remove",
  "offline.removed": "Removed offline pages for",
  "offline.remove_failed": "Offline pages could not be removed.",
  "offline.complete": "Offline chapter is complete.",
  "offline.still_failed": "pages still failed.",
  "offline.retry_failed": "Offline retry failed.",

  "extensions.title": "Extensions",
  "extensions.install_code": "Paste Code",
  "extensions.install_zip": "Zip File",
  "extensions.install": "Install Extension",
  "extensions.no_extensions": "No extensions installed",
  "extensions.desc": "Extensions add manga sources, including Spanish ones.",

  "browse.kicker": "Discover",
  "browse.title": "Browse manga",
  "browse.placeholder": "Search title, genre, or keyword",
  "browse.try": "Try:",
  "browse.catalog": "Catalog",
  "browse.results": "Search results",
  "browse.idle": "Live source search",
  "browse.hidden": "hidden by your manga language setting.",
  "browse.change_language": "Change language",

  "manga.lang_all": "All Languages",
};

const es: Dictionary = {
  "nav.library": "Biblioteca",
  "nav.browse": "Explorar",
  "nav.updates": "Novedades",
  "nav.history": "Historial",
  "nav.import": "Importar",
  "nav.archive": "Archivo",
  "nav.settings": "Ajustes",

  "settings.kicker": "Preferencias",
  "settings.title": "Ajustes",
  "settings.subtitle": "Tu cuenta, tu lectura y tu dispositivo en un solo lugar.",
  "settings.theme": "Tema",
  "settings.theme.desc": "Cambia entre la sala oscura y el tema claro de papel cálido.",
  "settings.reader.title": "Lectura",
  "settings.reader.desc": "Valores cómodos para capítulos largos. Se sincronizan con tu cuenta.",
  "settings.reader.preset": "Modo de lectura por defecto",
  "settings.reader.preset.manga": "Manga · ajustar a pantalla",
  "settings.reader.preset.webtoon": "Webtoon · ajustar al ancho",
  "settings.reader.preload": "Páginas a precargar",
  "settings.reader.speed": "Velocidad base del desplazamiento",
  "settings.reader.fit": "Ajuste por defecto",
  "settings.reader.fit.width": "Ajustar al ancho",
  "settings.reader.fit.screen": "Ajustar a pantalla",
  "settings.reader.awake": "Mantener la pantalla encendida al leer",
  "settings.reader.awake.desc": "Usa la API Screen Wake Lock si tu navegador la admite.",
  "settings.language.title": "Idioma",
  "settings.language.desc": "Elige el idioma de la app y el idioma de los mangas que quieres encontrar.",
  "settings.language.ui": "Idioma de la interfaz",
  "settings.language.content": "Idioma del manga",
  "settings.language.content.hint": "El manga en español viene de extensiones. Instala una en Avanzado.",
  "settings.language.all": "Todos los idiomas",
  "settings.group.device": "Este dispositivo",
  "settings.group.account": "Tu cuenta y tus datos",
  "settings.advanced": "Avanzado",
  "settings.advanced.desc": "Extensiones y diagnóstico. La mayoría de la gente no los necesita.",

  "offline.title": "Capítulos guardados",
  "offline.desc": "Capítulos guardados en este dispositivo. Las imágenes en caché nunca salen de él.",
  "offline.empty": "No hay capítulos guardados sin conexión en este dispositivo.",
  "offline.pages": "páginas",
  "offline.retry": "Reintentar",
  "offline.remove": "Quitar",
  "offline.removed": "Páginas sin conexión eliminadas de",
  "offline.remove_failed": "No se pudieron quitar las páginas sin conexión.",
  "offline.complete": "El capítulo sin conexión está completo.",
  "offline.still_failed": "páginas siguen fallando.",
  "offline.retry_failed": "Falló el reintento sin conexión.",

  "extensions.title": "Extensiones",
  "extensions.install_code": "Pegar Código",
  "extensions.install_zip": "Archivo Zip",
  "extensions.install": "Instalar Extensión",
  "extensions.no_extensions": "No hay extensiones instaladas",
  "extensions.desc": "Las extensiones añaden fuentes de manga, también en español.",

  "browse.kicker": "Descubrir",
  "browse.title": "Explorar manga",
  "browse.placeholder": "Busca por título, género o palabra clave",
  "browse.try": "Prueba:",
  "browse.catalog": "Catálogo",
  "browse.results": "Resultados de búsqueda",
  "browse.idle": "Búsqueda en fuentes en vivo",
  "browse.hidden": "ocultos por tu idioma de manga.",
  "browse.change_language": "Cambiar idioma",

  "manga.lang_all": "Todos los Idiomas",
};

const translations: Record<Locale, Dictionary> = { en, es };

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
  t: (key: string) => string;
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
    t: (key) => translations[locale][key] ?? en[key] ?? key,
  }), [locale, contentLanguage]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within a LocaleProvider");
  return context;
}
