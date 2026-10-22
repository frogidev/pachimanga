"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Locale = "en" | "es";

const STORAGE_KEY = "pachimanga-locale";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // General
    "app.name": "Pachimanga",
    "app.tagline": "Your private manga library. Import, organize, read and sync manga across your devices.",
    
    // Navigation
    "nav.library": "Library",
    "nav.browse": "Browse",
    "nav.updates": "Updates",
    "nav.history": "History",
    "nav.import": "Import",
    "nav.archive": "Archive",
    "nav.settings": "Settings",
    
    // Settings
    "settings.title": "Settings",
    "settings.subtitle": "Manage your account, reading experience, sync and device behavior in one place.",
    "settings.account": "Account",
    "settings.reader": "Reader",
    "settings.sync": "Sync",
    "settings.extensions": "Extensions",
    "settings.offline": "Offline Downloads",
    "settings.tracking": "Tracking",
    "settings.export": "Account Export",
    "settings.diagnostics": "Diagnostics",
    "settings.signout": "Sign Out",
    "settings.appearance": "Appearance",
    "settings.theme": "Theme",
    "settings.dark": "Dark",
    "settings.light": "Light",
    "settings.language": "Language",
    "settings.english": "English",
    "settings.spanish": "Spanish",
    
    // Reader
    "reader.reading": "Reading",
    "reader.play": "Play",
    "reader.pause": "Pause",
    "reader.speed": "Speed",
    "reader.fit": "Fit",
    "reader.fit_width": "Fit Width",
    "reader.fit_screen": "Fit Screen",
    "reader.auto_scroll": "Auto Scroll",
    "reader.keep_awake": "Keep Screen Awake",
    "reader.fullscreen": "Fullscreen",
    "reader.spread": "Spread",
    "reader.spread_auto": "Auto",
    "reader.spread_always": "Always",
    "reader.spread_never": "Never",
    "reader.next_chapter": "Next Chapter",
    "reader.prev_chapter": "Previous Chapter",
    "reader.chapter": "Chapter",
    "reader.page": "Page",
    "reader.progress": "Progress",
    
    // Library
    "library.title": "Your Library",
    "library.search": "Search your library...",
    "library.sort": "Sort",
    "library.filter": "Filter",
    "library.view": "View",
    "library.grid": "Grid",
    "library.list": "List",
    "library.continue": "Continue Reading",
    "library.collections": "Collections",
    "library.new_collection": "New Collection",
    "library.add_collection": "Add",
    "library.delete_collection": "Delete",
    "library.all_collections": "All Collections",
    "library.clear_filters": "Clear Filters",
    "library.empty": "Your library is empty",
    "library.empty_sub": "Add manga from Browse or Import your account data",
    "library.browse_sources": "Browse Live Sources",
    "library.import_data": "Import Account Data",
    "library.clear_filters_btn": "Clear Filters",
    "library.titles_count": "titles",
    
    // Browse
    "browse.title": "Browse",
    "browse.search": "Search MangaDex, WeebCentral...",
    "browse.searching": "Searching...",
    "browse.no_results": "No results found",
    "browse.search_placeholder": "Search MangaDex, WeebCentral...",
    "browse.add_to_library": "Add to Library",
    "browse.add_to_library_prompt": "Not in your library? Click to add.",
    
    // Import
    "import.title": "Import",
    "import.subtitle": "Scan screenshots or import backups from Tachiyomi, Mihon, and Tachimanga without rebuilding your library by hand.",
    "import.scan": "Scan screenshot or image",
    "import.backup": "Import app backup",
    "import.ocr": "OCR runs in your browser. The image itself is not uploaded to Pachimanga.",
    "import.backup_formats": "Tachiyomi/Mihon .tachibk, Tachimanga .tmb, or JSON backups.",
    "import.review": "Review",
    "import.match": "Match",
    "import.match_all": "Match All",
    "import.import": "Import",
    "import.importing": "Importing...",
    "import.import_selected": "Import Selected",
    "import.select_all": "Select All",
    "import.select_none": "Select None",
    "import.wipe": "Remove entire library",
    "import.wipe_confirm": "Remove your ENTIRE library, including all reading progress and history for this account? This affects matched, manually added, and imported titles and cannot be undone.",
    
    // Archive
    "archive.title": "Archive Reader",
    "archive.subtitle": "Open CBZ, ZIP, and other comic archives directly in your browser. Files never leave your device.",
    "archive.select": "Select Archive",
    "archive.page": "Page",
    "archive.of": "of",
    "archive.close": "Close",
    "archive.prev": "Previous",
    "archive.next": "Next",
    
    // Manga Detail
    "manga.read": "Read",
    "manga.chapters": "Chapters",
    "manga.description": "Description",
    "manga.author": "Author",
    "manga.artist": "Artist",
    "manga.status": "Status",
    "manga.genres": "Genres",
    "manga.source": "Source",
    "manga.add_to_library": "Add to Library",
    "manga.remove_from_library": "Remove from Library",
    "manga.reading_status": "Reading Status",
    "manga.reading": "Reading",
    "manga.completed": "Completed",
    "manga.on_hold": "On Hold",
    "manga.dropped": "Dropped",
    "manga.plan_to_read": "Plan to Read",
    "manga.ongoing": "Ongoing",
    "manga.complete": "Complete",
    "manga.hiatus": "Hiatus",
    "manga.cancelled": "Cancelled",
    "manga.unknown": "Unknown",
    
    // Chapters
    "chapters.title": "Chapters",
    "chapters.chapter": "Chapter",
    "chapters.volume": "Vol",
    "chapters.published": "Published",
    "chapters.read": "Read",
    "chapters.unread": "Unread",
    "chapters.mark_read": "Mark as Read",
    "chapters.mark_unread": "Mark as Unread",
    "chapters.mark_all": "Mark All",
    "chapters.new": "New",
    
    // Sync
    "sync.title": "Sync Status",
    "sync.syncing": "Syncing...",
    "sync.last_sync": "Last sync",
    "sync.sync_now": "Sync Now",
    "sync.pending": "Pending",
    "synced": "Synced",
    
    // Offline
    "offline.title": "Offline Downloads",
    "offline.download": "Download",
    "offline.remove": "Remove",
    "offline.downloaded": "Downloaded",
    "offline.downloading": "Downloading...",
    
    // Tracking
    "tracking.title": "Tracking",
    "tracking.anilist": "AniList",
    "tracking.mal": "MyAnimeList",
    "tracking.connect": "Connect",
    "tracking.disconnect": "Disconnect",
    
    // Extensions
    "extensions.title": "Extensions",
    "extensions.install_code": "Paste Code",
    "extensions.install_zip": "Zip File",
    "extensions.validate": "Validate Zip",
    "extensions.installing": "Installing...",
    "extensions.valid": "Valid extension package",
    "extensions.invalid": "Invalid extension",
    "extensions.choose_different": "Choose Different",
    "extensions.install": "Install Extension",
    "extensions.enabled": "Enabled",
    "extensions.disabled": "Disabled",
    "extensions.uninstall": "Uninstall",
    "extensions.no_extensions": "No extensions installed",
    "extensions.desc": "Install extensions to add new manga sources, readers, or features.",
    
    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.remove": "Remove",
    "common.close": "Close",
    "common.yes": "Yes",
    "common.no": "No",
    "common.ok": "OK",
    "common.retry": "Retry",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.of": "of",
    "common.page": "Page",
    "common.chapter": "Chapter",
    "common.volume": "Vol",
    
    // Auth
    "auth.sign_in": "Sign In",
    "auth.sign_up": "Sign Up",
    "auth.sign_out": "Sign Out",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirm_password": "Confirm Password",
    "auth.forgot_password": "Forgot Password?",
    "auth.reset_password": "Reset Password",
    "auth.resend_confirmation": "Resend Confirmation",
    "auth.welcome_back": "Welcome back",
    "auth.create_account": "Create Account",
    
    // Manga Language
    "manga.language": "Language",
    "manga.languages": "Languages",
    "manga.lang_english": "English",
    "manga.lang_spanish": "Spanish",
    "manga.lang_all": "All Languages",
    "manga.lang_filter": "Filter by Language",
    
    // Search
    "search.no_results": "No results found for",
    "search.add_to_library": "Add to Library",
    "search.not_in_library": "Not in your library? Click to add.",
    "search.browse_prompt": "Search live sources",
    
    // Archive Reader
    "archive.select_file": "Select Archive",
    "archive.loading": "Loading archive...",
    "archive.page_nav": "Page {current} of {total}",
    
    // Toast/Notifications
    "toast.added_to_library": "Added to library",
    "toast.removed_from_library": "Removed from library",
    "toast.sync_complete": "Sync complete",
    "toast.sync_failed": "Sync failed",
    "toast.download_started": "Download started",
    "toast.download_complete": "Download complete",
    "toast.error": "Something went wrong",
  },
  es: {
    // General
    "app.name": "Pachimanga",
    "app.tagline": "Tu biblioteca privada de manga. Importa, organiza, lee y sincroniza manga en todos tus dispositivos.",
    
    // Navigation
    "nav.library": "Biblioteca",
    "nav.browse": "Explorar",
    "nav.updates": "Actualizaciones",
    "nav.history": "Historial",
    "nav.import": "Importar",
    "nav.archive": "Archivos",
    "nav.settings": "Ajustes",
    
    // Settings
    "settings.title": "Ajustes",
    "settings.subtitle": "Gestiona tu cuenta, experiencia de lectura, sincronización y comportamiento del dispositivo en un solo lugar.",
    "settings.account": "Cuenta",
    "settings.reader": "Lector",
    "settings.sync": "Sincronización",
    "settings.extensions": "Extensiones",
    "settings.offline": "Descargas Offline",
    "settings.tracking": "Seguimiento",
    "settings.export": "Exportar Cuenta",
    "settings.diagnostics": "Diagnósticos",
    "settings.signout": "Cerrar Sesión",
    "settings.appearance": "Apariencia",
    "settings.theme": "Tema",
    "settings.dark": "Oscuro",
    "settings.light": "Claro",
    "settings.language": "Idioma",
    "settings.english": "Inglés",
    "settings.spanish": "Español",
    
    // Reader
    "reader.reading": "Leyendo",
    "reader.play": "Reproducir",
    "reader.pause": "Pausar",
    "reader.speed": "Velocidad",
    "reader.fit": "Ajuste",
    "reader.fit_width": "Ajustar Ancho",
    "reader.fit_screen": "Ajustar Pantalla",
    "reader.auto_scroll": "Desplazamiento Automático",
    "reader.keep_awake": "Mantener Pantalla Activa",
    "reader.fullscreen": "Pantalla Completa",
    "reader.spread": "Doble Página",
    "reader.spread_auto": "Auto",
    "reader.spread_always": "Siempre",
    "reader.spread_never": "Nunca",
    "reader.next_chapter": "Siguiente Capítulo",
    "reader.prev_chapter": "Capítulo Anterior",
    "reader.chapter": "Capítulo",
    "reader.page": "Página",
    "reader.progress": "Progreso",
    
    // Library
    "library.title": "Tu Biblioteca",
    "library.search": "Buscar en tu biblioteca...",
    "library.sort": "Ordenar",
    "library.filter": "Filtrar",
    "library.view": "Vista",
    "library.grid": "Cuadrícula",
    "library.list": "Lista",
    "library.continue": "Continuar Leyendo",
    "library.collections": "Colecciones",
    "library.new_collection": "Nueva Colección",
    "library.add_collection": "Añadir",
    "library.delete_collection": "Eliminar",
    "library.all_collections": "Todas las Colecciones",
    "library.clear_filters": "Limpiar Filtros",
    "library.empty": "Tu biblioteca está vacía",
    "library.empty_sub": "Añade manga desde Explorar o importa tus datos de cuenta",
    "library.browse_sources": "Explorar Fuentes",
    "library.import_data": "Importar Datos",
    "library.clear_filters_btn": "Limpiar Filtros",
    "library.titles_count": "títulos",
    
    // Browse
    "browse.title": "Explorar",
    "browse.search": "Buscar en MangaDex, WeebCentral...",
    "browse.searching": "Buscando...",
    "browse.no_results": "No se encontraron resultados",
    "browse.search_placeholder": "Buscar en MangaDex, WeebCentral...",
    "browse.add_to_library": "Añadir a Biblioteca",
    "browse.add_to_library_prompt": "¿No está en tu biblioteca? Haz clic para añadir.",
    
    // Import
    "import.title": "Importar",
    "import.subtitle": "Escanea capturas o importa copias de seguridad de Tachiyomi, Mihon y Tachimanga sin reconstruir tu biblioteca manualmente.",
    "import.scan": "Escanear captura o imagen",
    "import.backup": "Importar respaldo de app",
    "import.ocr": "El OCR se ejecuta en tu navegador. La imagen no se sube a Pachimanga.",
    "import.backup_formats": "Respaldos de Tachiyomi/Mihon .tachibk, Tachimanga .tmb, o JSON.",
    "import.review": "Revisar",
    "import.match": "Coincidir",
    "import.match_all": "Coincidir Todo",
    "import.import": "Importar",
    "import.importing": "Importando...",
    "import.import_selected": "Importar Seleccionados",
    "import.select_all": "Seleccionar Todo",
    "import.select_none": "Desmarcar Todo",
    "import.wipe": "Eliminar biblioteca completa",
    "import.wipe_confirm": "¿Eliminar tu BIBLIOTECA COMPLETA, incluyendo todo el progreso e historial de lectura de esta cuenta? Esto afecta títulos coincidentes, añadidos manualmente e importados y no se puede deshacer.",
    
    // Archive
    "archive.title": "Lector de Archivos",
    "archive.subtitle": "Abre archivos CBZ, ZIP y otros cómics directamente en tu navegador. Los archivos nunca salen de tu dispositivo.",
    "archive.select": "Seleccionar Archivo",
    "archive.page": "Página",
    "archive.of": "de",
    "archive.close": "Cerrar",
    "archive.prev": "Anterior",
    "archive.next": "Siguiente",
    
    // Manga Detail
    "manga.read": "Leer",
    "manga.chapters": "Capítulos",
    "manga.description": "Descripción",
    "manga.author": "Autor",
    "manga.artist": "Artista",
    "manga.status": "Estado",
    "manga.genres": "Géneros",
    "manga.source": "Fuente",
    "manga.add_to_library": "Añadir a Biblioteca",
    "manga.remove_from_library": "Eliminar de Biblioteca",
    "manga.reading_status": "Estado de Lectura",
    "manga.reading": "Leyendo",
    "manga.completed": "Completado",
    "manga.on_hold": "En Pausa",
    "manga.dropped": "Abandonado",
    "manga.plan_to_read": "Planeo Leer",
    "manga.ongoing": "En Emisión",
    "manga.complete": "Completado",
    "manga.hiatus": "En Pausa",
    "manga.cancelled": "Cancelado",
    "manga.unknown": "Desconocido",
    
    // Chapters
    "chapters.title": "Capítulos",
    "chapters.chapter": "Capítulo",
    "chapters.volume": "Vol",
    "chapters.published": "Publicado",
    "chapters.read": "Leído",
    "chapters.unread": "No Leído",
    "chapters.mark_read": "Marcar como Leído",
    "chapters.mark_unread": "Marcar como No Leído",
    "chapters.mark_all": "Marcar Todo",
    "chapters.new": "Nuevo",
    
    // Sync
    "sync.title": "Estado de Sincronización",
    "sync.syncing": "Sincronizando...",
    "sync.last_sync": "Última sincronización",
    "sync.sync_now": "Sincronizar Ahora",
    "sync.pending": "Pendiente",
    "synced": "Sincronizado",
    
    // Offline
    "offline.title": "Descargas Offline",
    "offline.download": "Descargar",
    "offline.remove": "Eliminar",
    "offline.downloaded": "Descargado",
    "offline.downloading": "Descargando...",
    
    // Tracking
    "tracking.title": "Seguimiento",
    "tracking.anilist": "AniList",
    "tracking.mal": "MyAnimeList",
    "tracking.connect": "Conectar",
    "tracking.disconnect": "Desconectar",
    
    // Extensions
    "extensions.title": "Extensiones",
    "extensions.install_code": "Pegar Código",
    "extensions.install_zip": "Archivo Zip",
    "extensions.validate": "Validar Zip",
    "extensions.installing": "Instalando...",
    "extensions.valid": "Paquete de extensión válido",
    "extensions.invalid": "Extensión inválida",
    "extensions.choose_different": "Elegir Otro",
    "extensions.install": "Instalar Extensión",
    "extensions.enabled": "Activado",
    "extensions.disabled": "Desactivado",
    "extensions.uninstall": "Desinstalar",
    "extensions.no_extensions": "No hay extensiones instaladas",
    "extensions.desc": "Instala extensiones para añadir nuevas fuentes de manga, lectores o funciones.",
    
    // Common
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "Éxito",
    "common.cancel": "Cancelar",
    "common.confirm": "Confirmar",
    "common.save": "Guardar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.add": "Añadir",
    "common.remove": "Quitar",
    "common.close": "Cerrar",
    "common.yes": "Sí",
    "common.no": "No",
    "common.ok": "OK",
    "common.retry": "Reintentar",
    "common.back": "Atrás",
    "common.next": "Siguiente",
    "common.previous": "Anterior",
    "common.of": "de",
    "common.page": "Página",
    "common.chapter": "Capítulo",
    "common.volume": "Vol",
    
    // Auth
    "auth.sign_in": "Iniciar Sesión",
    "auth.sign_up": "Registrarse",
    "auth.sign_out": "Cerrar Sesión",
    "auth.email": "Correo",
    "auth.password": "Contraseña",
    "auth.confirm_password": "Confirmar Contraseña",
    "auth.forgot_password": "¿Olvidaste la contraseña?",
    "auth.reset_password": "Restablecer Contraseña",
    "auth.resend_confirmation": "Reenviar Confirmación",
    "auth.welcome_back": "Bienvenido de nuevo",
    "auth.create_account": "Crear Cuenta",
    
    // Manga Language
    "manga.language": "Idioma",
    "manga.languages": "Idiomas",
    "manga.lang_english": "Inglés",
    "manga.lang_spanish": "Español",
    "manga.lang_all": "Todos los Idiomas",
    "manga.lang_filter": "Filtrar por Idioma",
    
    // Search
    "search.no_results": "No se encontraron resultados para",
    "search.add_to_library": "Añadir a Biblioteca",
    "search.not_in_library": "¿No está en tu biblioteca? Haz clic para añadir.",
    "search.browse_prompt": "Buscar en fuentes en vivo",
    
    // Archive Reader
    "archive.select_file": "Seleccionar Archivo",
    "archive.loading": "Cargando archivo...",
    "archive.page_nav": "Página {current} de {total}",
    
    // Toast/Notifications
    "toast.added_to_library": "Añadido a la biblioteca",
    "toast.removed_from_library": "Eliminado de la biblioteca",
    "toast.sync_complete": "Sincronización completada",
    "toast.sync_failed": "Error al sincronizar",
    "toast.download_started": "Descarga iniciada",
    "toast.download_complete": "Descarga completada",
    "toast.error": "Algo salió mal",
  },
};

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {}
  return "en";
}

export function setLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, locale);
}

export function t(key: string, locale?: Locale): string {
  const loc = locale || getLocale();
  return translations[loc]?.[key] || translations.en[key] || key;
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") return stored;
    } catch {}
    return "en";
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  };

  const translate = (key: string) => t(key, locale);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}