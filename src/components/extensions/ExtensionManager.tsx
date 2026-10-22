'use client';

import { useEffect, useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  installExtension,
  installExtensionFromZip,
  uninstallExtension,
  toggleExtension,
  getInstalledExtensions,
  updateExtensionSettings,
  type InstalledExtension,
} from '@/lib/extensions';
import { useLocale } from '@/lib/i18n';

/* Icons come from arbitrary extension hosts, so next/image cannot optimize them. */
function ExtensionIcon({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={32} height={32} loading="lazy" referrerPolicy="no-referrer" className="size-8 rounded" />;
}

export function ExtensionManager() {
  const [extensions, setExtensions] = useState<InstalledExtension[]>([]);
  const [showInstall, setShowInstall] = useState(false);
  const [installTab, setInstallTab] = useState<'code' | 'zip'>('code');
  const [installCode, setInstallCode] = useState('');
  const [installStatus, setInstallStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipValidating, setZipValidating] = useState(false);
  const [zipValidation, setZipValidation] = useState<{
    valid: boolean;
    manifest?: { id: string; name: string; version: string; sourceId: string; sourceName: string } | null;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshExtensions();
  }, []);

  function refreshExtensions() {
    setExtensions(getInstalledExtensions());
  }

  async function handleInstall() {
    setInstallStatus(null);
    if (installTab === 'code') {
      const result = await installExtension(installCode);
      if (result.success) {
        setInstallStatus({ type: 'success', message: `Extension "${result.extension?.manifest.name}" installed successfully` });
        setInstallCode('');
        setShowInstall(false);
        refreshExtensions();
      } else {
        setInstallStatus({ type: 'error', message: result.error || 'Installation failed' });
      }
    }
  }

  async function handleValidateZip() {
    if (!zipFile) return;
    setZipValidating(true);
    setZipValidation(null);

    try {
      const arrayBuffer = await zipFile.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        setZipValidation({ valid: false, error: 'No manifest.json found in zip' });
        return;
      }

      const manifestContent = await manifestFile.async('text');
      let manifest: Record<string, unknown> | null = null;

      try {
        manifest = JSON.parse(manifestContent);
      } catch {
        setZipValidation({ valid: false, error: 'Invalid manifest format' });
        return;
      }

      const sourceFile = zip.file('source.js') || zip.file('index.js') || zip.file('main.js');
      if (!sourceFile) {
        setZipValidation({ valid: false, error: 'No source.js, index.js, or main.js found in zip' });
        return;
      }

      const requiredFields = ['id', 'name', 'version', 'description', 'author', 'sourceId', 'sourceName'];
      if (!manifest) {
        setZipValidation({ valid: false, error: 'Manifest is null after parsing' });
        return;
      }
      for (const field of requiredFields) {
        if (!manifest[field]) {
          setZipValidation({ valid: false, error: `Manifest missing required field: ${field}` });
          return;
        }
      }

      // Type assertion after validation
      const validManifest = manifest as {
        id: string;
        name: string;
        version: string;
        description: string;
        author: string;
        sourceId: string;
        sourceName: string;
      };

      setZipValidation({
        valid: true,
        manifest: {
          id: validManifest.id,
          name: validManifest.name,
          version: validManifest.version,
          sourceId: validManifest.sourceId,
          sourceName: validManifest.sourceName,
        },
      });
    } catch (error) {
      setZipValidation({ valid: false, error: error instanceof Error ? error.message : 'Validation failed' });
    } finally {
      setZipValidating(false);
    }
  }

  async function handleInstallZip() {
    if (!zipFile) return;
    const result = await installExtensionFromZip(zipFile);
    if (result.success) {
      setInstallStatus({ type: 'success', message: `Extension "${result.extension?.manifest.name}" installed successfully` });
      setZipFile(null);
      setZipValidation(null);
      setShowInstall(false);
      refreshExtensions();
    } else {
      setInstallStatus({ type: 'error', message: result.error || 'Installation failed' });
    }
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.zip')) {
      setInstallStatus({ type: 'error', message: 'Please select a .zip file' });
      return;
    }
    setZipFile(file);
    setZipValidation(null);
    setInstallStatus(null);
  }

  function clearZip() {
    setZipFile(null);
    setZipValidation(null);
    setInstallStatus(null);
  }

  async function handleUninstall(id: string) {
    if (!window.confirm('Uninstall this extension?')) return;
    uninstallExtension(id);
    refreshExtensions();
  }

  async function handleToggle(id: string) {
    toggleExtension(id);
    refreshExtensions();
  }

  async function handleSettingsChange(id: string, settings: Record<string, unknown>) {
    updateExtensionSettings(id, settings);
    refreshExtensions();
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  function renderZipContent() {
    if (zipFile) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#0e0d14] rounded-lg border border-white/[.06]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-medium text-zinc-100">{zipFile.name}</p>
                <p className="text-xs text-zinc-500">{(zipFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              className="text-zinc-500 hover:text-red-300 transition"
              onClick={clearZip}
              aria-label="Remove file"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            className="button-secondary w-full px-4 py-2"
            onClick={handleValidateZip}
          >
            {zipValidating ? 'Validating...' : 'Validate Zip'}
          </button>

          {zipValidation && !zipValidating && (
            <div className={`p-4 rounded-lg ${zipValidation.valid ? 'bg-green-400/[.1] border border-green-300/20' : 'bg-red-400/[.1] border border-red-300/20'}`}>
              {zipValidation.valid ? (
                <>
                  <div className="flex items-center gap-2 text-green-300 mb-2">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="font-medium">Valid extension package</span>
                  </div>
                  <div className="grid gap-2 text-sm text-zinc-300 mt-2">
                    <div><span className="text-zinc-500">ID:</span> {zipValidation.manifest?.id}</div>
                    <div><span className="text-zinc-500">Name:</span> {zipValidation.manifest?.name}</div>
                    <div><span className="text-zinc-500">Version:</span> {zipValidation.manifest?.version}</div>
                    <div><span className="text-zinc-500">Source ID:</span> {zipValidation.manifest?.sourceId}</div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-red-300">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>{zipValidation.error}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <button
              className="button-secondary px-4 py-2"
              onClick={clearZip}
            >
              Choose Different
            </button>
            {zipValidation?.valid && (
              <button
                className="button-primary px-4 py-2"
                onClick={handleInstallZip}
              >
                Install Extension
              </button>
            )}
          </div>
        </div>
      )
    } else {
      return (
        <div>
          <div className="size-16 mx-auto mb-3 text-zinc-500">📦</div>
          <p className="text-zinc-400 mb-1">Drag & drop a .zip file here</p>
          <p className="text-xs text-zinc-600 mb-4">or</p>
          <button
            className="button-secondary px-4 py-2"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </button>
          <p className="text-xs text-zinc-600 mt-2">Accepts .zip files only</p>
        </div>
      )
    }
  }

  function renderZipTab() {
    return (
      <div className="mt-4">
        <h3 className="font-semibold text-zinc-100 mb-4">{t("extensions.install_zip")}</h3>
        <p className="text-sm text-zinc-500 mb-4">
          The zip file should contain <code>manifest.json</code> and <code>source.js</code> (or <code>index.js</code>/<code>main.js</code>).
        </p>

        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition ${zipFile ? 'border-pink-400 bg-pink-400/[.05]' : 'border-white/[.1] hover:border-pink-400/50 hover:bg-white/[.02]'}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file && file.name.endsWith('.zip')) handleFile(file); else alert('Please drop a .zip file'); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />

          {renderZipContent()}

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />
        </div>
      </div>
    );
  }

  const { t } = useLocale();

  useEffect(() => {
    refreshExtensions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-100">{t("extensions.title")}</h2>
        <button
          className="button-primary px-4 py-2 text-sm"
          onClick={() => { setShowInstall(true); setInstallTab('zip'); }}
        >
          {t("extensions.install")}
        </button>
      </div>

      {installStatus && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          installStatus.type === 'success'
            ? 'border border-green-300/20 bg-green-400/[.05] text-green-300'
            : 'border border-red-300/20 bg-red-400/[.05] text-red-300'
        }`}>
          {installStatus.message}
        </div>
      )}

      {showInstall && (
        <div className="surface-card p-5 rounded-xl border border-white/[.06]">
          <div className="flex items-center gap-2 border-b border-white/[.06] pb-3 mb-4">
            <button
              className={`px-3 py-2 text-sm rounded-lg transition ${
                installTab === 'code'
                  ? 'bg-pink-400/20 text-pink-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[.05]'
              }`}
              onClick={() => setInstallTab('code')}
            >
              {t("extensions.install_code")}
            </button>
            <button
              className={`px-3 py-2 text-sm rounded-lg transition ${
                installTab === 'zip'
                  ? 'bg-pink-400/20 text-pink-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[.05]'
              }`}
              onClick={() => setInstallTab('zip')}
            >
              {t("extensions.install_zip")}
            </button>
          </div>

          {installTab === 'code' ? (
            <div className="mt-4">
              <h3 className="font-semibold text-zinc-100 mb-4">Install from Code</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Paste the extension JavaScript code below. The extension must export a <code>manifest</code> object and a <code>source</code> object.
              </p>
              <textarea
                className="w-full h-64 bg-[#0e0d14] border border-white/[.1] rounded-lg p-3 text-zinc-100 font-mono text-sm resize-y"
                value={installCode}
                onChange={(e) => setInstallCode(e.target.value)}
                placeholder="// Extension code here..."
                spellCheck={false}
              />
              <div className="mt-4 flex gap-3">
                <button className="button-primary px-4 py-2" onClick={handleInstall}>Install</button>
                <button className="button-secondary px-4 py-2" onClick={() => { setShowInstall(false); setInstallCode(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            renderZipTab()
          )}

          <div className="mt-4 flex gap-3 justify-end">
            <button className="button-secondary px-4 py-2" onClick={() => { setShowInstall(false); setInstallCode(''); setZipFile(null); setZipValidation(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {extensions.length === 0 && !showInstall && (
        <div className="surface-card p-8 rounded-xl border border-white/[.06] text-center">
          <div className="text-4xl mb-3">🧩</div>
          <h3 className="font-semibold text-zinc-100 mb-2">{t("extensions.no_extensions")}</h3>
          <p className="text-zinc-500 mb-4">{t("extensions.desc")}</p>
          <button className="button-primary px-4 py-2" onClick={() => { setShowInstall(true); setInstallTab('zip'); }}>{t("extensions.install")}</button>
        </div>
      )}

      {extensions.length > 0 && (
        <div className="space-y-3">
          {extensions.map((extension) => (
            <ExtensionCard
              key={extension.manifest.id}
              extension={extension}
              expanded={expandedId === extension.manifest.id}
              onToggleExpand={() => toggleExpand(extension.manifest.id)}
              onToggle={() => handleToggle(extension.manifest.id)}
              onUninstall={() => handleUninstall(extension.manifest.id)}
              onSettingsChange={handleSettingsChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExtensionCard({
  extension,
  expanded,
  onToggleExpand,
  onToggle,
  onUninstall,
  onSettingsChange,
}: {
  extension: InstalledExtension;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onUninstall: () => void;
  onSettingsChange: (id: string, settings: Record<string, unknown>) => void;
}) {
  const { manifest, enabled, installedAt, settings } = extension;

  return (
    <div className="surface-card rounded-xl border border-white/[.06] overflow-hidden">
      <button
        className="w-full p-4 flex items-center gap-4 text-left"
        onClick={onToggleExpand}
      >
        <div className={`size-12 rounded-lg flex items-center justify-center ${enabled ? 'bg-green-400/10' : 'bg-zinc-800'}`}>
          {manifest.icon ? (
            <ExtensionIcon src={manifest.icon} />
          ) : (
            <span className="text-2xl">📦</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-zinc-100 truncate">{manifest.name}</h3>
            <span className={`px-2 py-0.5 text-xs rounded-full ${enabled ? 'bg-green-400/20 text-green-300' : 'bg-zinc-700 text-zinc-500'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 truncate">{manifest.description}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-600">
            <span>v{manifest.version}</span>
            <span>•</span>
            <span>Source: {manifest.sourceName}</span>
            <span>•</span>
            <span>Installed: {new Date(installedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`toggle-switch ${enabled ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            aria-label={enabled ? 'Disable' : 'Enable'}
          >
            <span className="toggle-thumb" />
          </button>
          <button
            className="p-2 text-zinc-500 hover:text-red-300 transition"
            onClick={(e) => { e.stopPropagation(); onUninstall(); }}
            aria-label="Uninstall"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[.06] p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Extension ID</label>
              <code className="text-xs text-zinc-400 bg-[#0e0d14] px-2 py-1 rounded block break-all">{manifest.id}</code>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Source ID</label>
              <code className="text-xs text-zinc-400 bg-[#0e0d14] px-2 py-1 rounded block break-all">{manifest.sourceId}</code>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Author</label>
              <span className="text-sm text-zinc-300">{manifest.author}</span>
            </div>
            {manifest.website && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Website</label>
                <a href={manifest.website} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:text-sky-300 break-all">{manifest.website}</a>
              </div>
            )}
          </div>

          {manifest.permissions && manifest.permissions.length > 0 && (
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {manifest.permissions.map((perm) => (
                  <span key={perm} className="px-2 py-1 text-xs bg-zinc-800 rounded text-zinc-400">{perm}</span>
                ))}
              </div>
            </div>
          )}

          {settings && Object.keys(settings).length > 0 && (
            <div>
              <h4 className="font-medium text-zinc-100 mb-3">Settings</h4>
              <div className="space-y-3">
                {Object.entries(settings).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-zinc-300 min-w-[150px]">{key}</label>
                    {typeof value === 'boolean' && (
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => onSettingsChange(manifest.id, { ...settings, [key]: e.target.checked })}
                        className="accent-pink-400"
                      />
                    )}
                    {typeof value === 'string' && (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => onSettingsChange(manifest.id, { ...settings, [key]: e.target.value })}
                        className="flex-1 bg-[#0e0d14] border border-white/[.1] rounded px-3 py-1.5 text-sm text-zinc-100"
                      />
                    )}
                    {typeof value === 'number' && (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => onSettingsChange(manifest.id, { ...settings, [key]: Number(e.target.value) })}
                        className="w-32 bg-[#0e0d14] border border-white/[.1] rounded px-3 py-1.5 text-sm text-zinc-100"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}