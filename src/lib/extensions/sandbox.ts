'use client';

import type { ExtensionManifest, ExtensionSource } from './types';

/**
 * Extension code runs in a sandboxed iframe without `allow-same-origin`: it gets an opaque
 * origin, so it cannot read this page's cookies, localStorage, IndexedDB or the Supabase
 * session. Only structured-cloneable data crosses the postMessage bridge.
 * shortcut: the iframe can still make network requests (CORS-limited, no credentials); a
 * per-manifest host allowlist needs a CSP on the srcdoc, add it if untrusted installs grow.
 */

const LOAD_TIMEOUT_MS = 5_000;
const CALL_TIMEOUT_MS = 30_000;
const REQUIRED_FIELDS = ['id', 'name', 'version', 'description', 'author', 'sourceId', 'sourceName'] as const;
const REQUIRED_METHODS = ['search', 'getManga', 'getChapters', 'getChapterPages'] as const;

const FRAME_SCRIPT = `
const post = (message) => parent.postMessage(message, '*');
let loaded = null;
addEventListener('message', async (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'load') {
    try {
      const exports = {};
      new Function('exports', String(msg.code))(exports);
      if (!exports.manifest || typeof exports.manifest !== 'object') throw new Error('ext.err.no_manifest_export');
      if (!exports.source || typeof exports.source !== 'object') throw new Error('ext.err.no_source_export');
      loaded = exports;
      post({ type: 'loaded', manifest: JSON.parse(JSON.stringify(exports.manifest)), methods: Object.keys(exports.source).filter((k) => typeof exports.source[k] === 'function') });
    } catch (error) {
      post({ type: 'load-error', error: error && error.message ? String(error.message) : 'ext.err.exec' });
    }
  } else if (msg.type === 'call' && loaded) {
    try {
      const fn = loaded.source[msg.method];
      if (typeof fn !== 'function') throw new Error('ext.err.unknown_method');
      const value = await fn.apply(loaded.source, msg.args || []);
      post({ type: 'result', id: msg.id, value: JSON.parse(JSON.stringify(value ?? null)) });
    } catch (error) {
      post({ type: 'result', id: msg.id, error: error && error.message ? String(error.message) : 'ext.err.call' });
    }
  }
});
post({ type: 'ready' });
`;

export type SandboxedExtension = {
  manifest: ExtensionManifest;
  source: ExtensionSource;
  destroy(): void;
};

type Pending = { resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> };

function validateManifest(manifest: ExtensionManifest) {
  for (const field of REQUIRED_FIELDS) {
    if (!manifest[field]) throw new Error(`ext.err.missing_field|${field}`);
  }
}

export function loadSandboxedExtension(code: string): Promise<SandboxedExtension> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.display = 'none';
    iframe.srcdoc = `<!doctype html><meta charset="utf-8"><script>${FRAME_SCRIPT.replaceAll('</script', '<\\/script')}</script>`;

    const pending = new Map<number, Pending>();
    let nextId = 1;
    let settled = false;

    const destroy = () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(loadTimer);
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('ext.err.unloaded'));
      }
      pending.clear();
      iframe.remove();
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      destroy();
      reject(error);
    };

    function call(method: string, args: unknown[]) {
      return new Promise<unknown>((res, rej) => {
        const id = nextId++;
        const timer = setTimeout(() => {
          pending.delete(id);
          rej(new Error(`ext.err.timeout|${method}`));
        }, CALL_TIMEOUT_MS);
        pending.set(id, { resolve: res, reject: rej, timer });
        iframe.contentWindow?.postMessage({ type: 'call', id, method, args }, '*');
      });
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data as Record<string, unknown> | null;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ready') {
        iframe.contentWindow?.postMessage({ type: 'load', code }, '*');
      } else if (msg.type === 'load-error') {
        fail(new Error(String(msg.error)));
      } else if (msg.type === 'loaded' && !settled) {
        try {
          const manifest = msg.manifest as ExtensionManifest;
          validateManifest(manifest);
          const methods = new Set(msg.methods as string[]);
          for (const method of REQUIRED_METHODS) {
            if (!methods.has(method)) throw new Error(`ext.err.missing_method|${method}`);
          }
          settled = true;
          clearTimeout(loadTimer);
          resolve({
            manifest,
            destroy,
            source: {
              manifest,
              search: (query) => call('search', [query]) as ReturnType<ExtensionSource['search']>,
              getManga: (id) => call('getManga', [id]) as ReturnType<ExtensionSource['getManga']>,
              getChapters: (mangaId) => call('getChapters', [mangaId]) as ReturnType<ExtensionSource['getChapters']>,
              getChapterPages: (chapterId) => call('getChapterPages', [chapterId]) as ReturnType<ExtensionSource['getChapterPages']>,
            },
          });
        } catch (error) {
          fail(error instanceof Error ? error : new Error('ext.err.invalid'));
        }
      } else if (msg.type === 'result' && typeof msg.id === 'number') {
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (typeof msg.error === 'string') entry.reject(new Error(msg.error));
        else entry.resolve(msg.value);
      }
    }

    const loadTimer = setTimeout(() => fail(new Error('ext.err.load_timeout')), LOAD_TIMEOUT_MS);
    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}

export async function validateExtensionCode(code: string): Promise<{ valid: boolean; manifest?: ExtensionManifest; error?: string }> {
  try {
    const extension = await loadSandboxedExtension(code);
    extension.destroy();
    return { valid: true, manifest: extension.manifest };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'ext.err.validation' };
  }
}
