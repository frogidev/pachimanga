'use client';

import type { ExtensionSandbox, ExtensionSource, ExtensionManifest } from './types';

/**
 * Simple extension sandbox using Function constructor with limited scope.
 * This is a safer alternative to eval but still allows dynamic code execution.
 * For production, a proper sandbox like QuickJS or iframe-based sandbox should be used.
 */

function createSafeGlobals(): Record<string, unknown> {
  return {
    fetch: fetch.bind(window),
    console: {
      log: (...args: unknown[]) => console.log('[Extension]', ...args),
      warn: (...args: unknown[]) => console.warn('[Extension]', ...args),
      error: (...args: unknown[]) => console.error('[Extension]', ...args),
      info: (...args: unknown[]) => console.info('[Extension]', ...args),
      debug: (...args: unknown[]) => console.debug('[Extension]', ...args),
    },
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    Promise: window.Promise,
    JSON: window.JSON,
    Math: window.Math,
    Date: window.Date,
    Object: window.Object,
    Array: window.Array,
    String: window.String,
    Number: window.Number,
    Boolean: window.Boolean,
    Map: window.Map,
    Set: window.Set,
    RegExp: window.RegExp,
    Error: window.Error,
    TypeError: window.TypeError,
    URIError: window.URIError,
    encodeURIComponent: window.encodeURIComponent,
    decodeURIComponent: window.decodeURIComponent,
    btoa: window.btoa,
    atob: window.atob,
    URL: window.URL,
    URLSearchParams: window.URLSearchParams,
    Headers: window.Headers,
    Request: window.Request,
    Response: window.Response,
    FormData: window.FormData,
    Blob: window.Blob,
    crypto: window.crypto,
  };
}

export async function createExtensionSandbox(): Promise<ExtensionSandbox> {
  const sandbox: ExtensionSandbox = {
    async run(code: string): Promise<ExtensionSource> {
      // Create a safe execution environment
      const globals = createSafeGlobals();
      
      // Wrap the code in a function to isolate scope
      const wrapper = `
        (function(globals) {
          with (globals) {
            ${code}
          }
          return exports;
        })
      `;
      
      let exports: { manifest: ExtensionManifest; source: ExtensionSource };
      try {
        const fn = new Function('globals', wrapper) as (globals: Record<string, unknown>) => { manifest: ExtensionManifest; source: ExtensionSource };
        exports = fn(globals);
      } catch (error) {
        throw new Error(`Extension execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (!exports || typeof exports !== 'object') {
        throw new Error('Extension must export an object');
      }

      const manifest = exports.manifest;
      if (!manifest || typeof manifest !== 'object') {
        throw new Error('Extension must export a manifest object');
      }

      const requiredFields = ['id', 'name', 'version', 'description', 'author', 'sourceId', 'sourceName'];
      for (const field of requiredFields) {
        if (!manifest[field as keyof ExtensionManifest]) {
          throw new Error(`Manifest missing required field: ${field}`);
        }
      }

      const source = exports.source;
      if (!source || typeof source !== 'object') {
        throw new Error('Extension must export a source object');
      }

      const requiredMethods = ['search', 'getManga', 'getChapters', 'getChapterPages'] as const;
      for (const method of requiredMethods) {
        if (typeof (source as unknown as Record<string, unknown>)[method] !== 'function') {
          throw new Error(`Source missing required method: ${method}`);
        }
      }

      return source;
    },

    terminate() {
      // No-op for Function-based sandbox
    },
  };

  return sandbox;
}

export async function validateExtensionCode(code: string): Promise<{ valid: boolean; manifest?: ExtensionManifest; error?: string }> {
  try {
    const globals = createSafeGlobals();
    
    const wrapper = `
      (function(globals) {
        with (globals) {
          ${code}
        }
        return exports;
      })
    `;
    
    const fn = new Function('globals', wrapper) as (globals: Record<string, unknown>) => { manifest: ExtensionManifest; source: ExtensionSource };
    const exports = fn(globals);

    if (!exports || typeof exports !== 'object') {
      return { valid: false, error: 'Extension must export an object' };
    }

    const manifest = exports.manifest;
    if (!manifest || typeof manifest !== 'object') {
      return { valid: false, error: 'Extension must export a manifest object' };
    }

    const requiredFields = ['id', 'name', 'version', 'description', 'author', 'sourceId', 'sourceName'];
    for (const field of requiredFields) {
      if (!manifest[field as keyof ExtensionManifest]) {
        return { valid: false, error: `Manifest missing required field: ${field}` };
      }
    }

    const source = exports.source;
    if (!source || typeof source !== 'object') {
      return { valid: false, error: 'Extension must export a source object' };
    }

    const requiredMethods = ['search', 'getManga', 'getChapters', 'getChapterPages'] as const;
    for (const method of requiredMethods) {
      if (typeof (source as unknown as Record<string, unknown>)[method] !== 'function') {
        return { valid: false, error: `Source missing required method: ${method}` };
      }
    }

    return { valid: true, manifest };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}