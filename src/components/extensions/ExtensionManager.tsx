'use client';

import { useEffect, useState } from 'react';
import {
  installExtension,
  uninstallExtension,
  toggleExtension,
  getInstalledExtensions,
  updateExtensionSettings,
  type InstalledExtension,
} from '@/lib/extensions';

export function ExtensionManager() {
  const [extensions, setExtensions] = useState<InstalledExtension[]>([]);
  const [showInstall, setShowInstall] = useState(false);
  const [installCode, setInstallCode] = useState('');
  const [installStatus, setInstallStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    refreshExtensions();
  }, []);

  function refreshExtensions() {
    setExtensions(getInstalledExtensions());
  }

  async function handleInstall() {
    setInstallStatus(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-100">Extensions</h2>
        <button
          className="button-primary px-4 py-2 text-sm"
          onClick={() => setShowInstall(true)}
        >
          Install Extension
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
          <h3 className="font-semibold text-zinc-100 mb-4">Install Extension</h3>
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
      )}

      {extensions.length === 0 && !showInstall && (
        <div className="surface-card p-8 rounded-xl border border-white/[.06] text-center">
          <div className="text-4xl mb-3">🧩</div>
          <h3 className="font-semibold text-zinc-100 mb-2">No extensions installed</h3>
          <p className="text-zinc-500 mb-4">Install extensions to add new manga sources, readers, or features.</p>
          <button className="button-primary px-4 py-2" onClick={() => setShowInstall(true)}>Install Extension</button>
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
            <img src={manifest.icon} alt="" className="size-8 rounded" />
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