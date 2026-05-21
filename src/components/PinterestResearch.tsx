import React, { useState, useCallback, useEffect } from 'react';
import { PinSearchSection } from './pinterest/PinSearchSection';
import { AccountExplorerSection } from './pinterest/AccountExplorerSection';
import { AccountTrackerSection } from './pinterest/AccountTrackerSection';
import { BoardsManagerSection } from './pinterest/BoardsManagerSection';
import { SavedPinsSection } from './pinterest/SavedPinsSection';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeywordResult {
  keyword: string;
  relatedTerms: string[];
  guides: string[];
}

interface ResearchAccount {
  id: string;
  label: string;
  status: 'active' | 'banned' | 'rate_limited';
  addedAt: string;
  lastUsedAt: string | null;
  failCount: number;
}

type Section = 'keywords' | 'pinSearch' | 'accountExplorer' | 'accountTracker' | 'boardsManager' | 'savedPins' | 'settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeJson = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Server returned a non-JSON response. Make sure the dev server is running.');
  return res.json();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TagBadge: React.FC<{ text: string; color?: string }> = ({ text, color = 'bg-red-100 text-red-700' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} mr-1.5 mb-1.5`}>
    {text}
  </span>
);

const StatusBadge: React.FC<{ status: ResearchAccount['status'] }> = ({ status }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    banned: 'bg-red-100 text-red-700',
    rate_limited: 'bg-yellow-100 text-yellow-700',
  };
  return <TagBadge text={status} color={colors[status]} />;
};

// ─── Keyword Explorer Section ─────────────────────────────────────────────────

const KeywordExplorerSection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestTimer, setSuggestTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [trending, setTrending] = useState<string[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [showTrending, setShowTrending] = useState(false);

  const fetchSuggestions = useCallback((q: string) => {
    if (suggestTimer) clearTimeout(suggestTimer);
    if (!q || q.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/research/suggestions?q=${encodeURIComponent(q)}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return;
        const data = await res.json();
        if (data.suggestions) setSuggestions(data.suggestions.slice(0, 8));
      } catch { /* ignore */ }
    }, 350);
    setSuggestTimer(t);
  }, [suggestTimer]);

  const handleSearch = async (q?: string) => {
    const searchTerm = q || query;
    if (!searchTerm.trim()) return;
    setLoading(true); setError(''); setResult(null); setSuggestions([]);
    try {
      const res = await fetch(`/api/research/keywords?q=${encodeURIComponent(searchTerm)}`);
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to fetch keywords');
      setResult(data.data);
      setQuery(searchTerm);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchTrending = async () => {
    setShowTrending(true);
    if (trending.length > 0) return;
    setTrendingLoading(true);
    try {
      const res = await fetch('/api/research/trending');
      const data = await safeJson(res);
      if (res.ok) setTrending(data.trends || []);
    } catch {} finally { setTrendingLoading(false); }
  };

  return (
    <div>
      {/* Search */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 mb-6">
        <h3 className="text-white font-bold text-lg mb-3 text-center">🔍 Keyword Explorer</h3>
        <div className="relative max-w-xl mx-auto">
          <input value={query} onChange={e => { setQuery(e.target.value); fetchSuggestions(e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a keyword…" className="w-full px-4 py-3 rounded-lg text-sm pr-24 focus:outline-none focus:ring-2 focus:ring-orange-300" />
          <button onClick={() => handleSearch()} disabled={loading}
            className="absolute right-1 top-1 bottom-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 rounded-lg text-sm font-bold">
            {loading ? '…' : 'Search'}
          </button>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-10">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSearch(s)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trending toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={fetchTrending} className="text-sm px-4 py-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 font-medium">
          🔥 {showTrending ? 'Trending Keywords' : 'Show Trending'}
        </button>
      </div>

      {showTrending && (
        <div className="mb-6">
          {trendingLoading ? <div className="text-sm text-gray-400">Loading trends…</div> : (
            <div className="flex flex-wrap gap-2">
              {trending.map((t, i) => (
                <button key={i} onClick={() => handleSearch(t)}
                  className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm hover:bg-orange-100 transition-colors font-medium">
                  🔥 {t}
                </button>
              ))}
              {trending.length === 0 && <span className="text-sm text-gray-400">No trending data available</span>}
            </div>
          )}
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">❌ {error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-bold text-gray-900 text-lg mb-3">📊 Results for "{result.keyword}"</h4>
            {result.relatedTerms.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-gray-600 mb-2">Related Keywords</h5>
                <div className="flex flex-wrap gap-2">
                  {result.relatedTerms.map((t, i) => (
                    <button key={i} onClick={() => handleSearch(t)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100">{t}</button>
                  ))}
                </div>
              </div>
            )}
            {result.guides.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-600 mb-2">Pinterest Guides</h5>
                <div className="flex flex-wrap gap-2">
                  {result.guides.map((g, i) => <TagBadge key={i} text={g} color="bg-green-50 text-green-700" />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Settings Section (Account Pool) ──────────────────────────────────────────

const SettingsSection: React.FC = () => {
  const [accounts, setAccounts] = useState<ResearchAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', cookie: '', csrfToken: '' });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/research/accounts');
      const data = await safeJson(res);
      setAccounts(data.accounts || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const validateForm = () => {
    if (!form.label.trim()) return 'Label is required';
    if (!form.cookie.trim()) return 'Cookie is required';
    if (!form.csrfToken.trim()) return 'CSRF token is required';
    if (form.cookie.trim() === '...' || form.cookie.trim().length < 20)
      return 'Cookie looks invalid — paste the full cookie string from Chrome DevTools.';
    if (form.csrfToken.trim() === '...' || form.csrfToken.trim().length < 8)
      return 'CSRF token looks invalid — paste the full x-csrftoken value from Chrome DevTools.';
    return null;
  };

  const handleTest = async () => {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setTesting(true); setTestResult(null); setError('');
    try {
      const res = await fetch('/api/research/test-cookie', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: form.cookie, csrfToken: form.csrfToken }),
      });
      const data = await safeJson(res);
      setTestResult({ ok: data.ok, message: data.message });
    } catch (e: any) { setTestResult({ ok: false, message: e.message }); }
    finally { setTesting(false); }
  };

  const handleAdd = async () => {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/research/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error);
      setForm({ label: '', cookie: '', csrfToken: '' }); setTestResult(null); setShowForm(false); loadAccounts();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/research/accounts/${id}`, { method: 'DELETE' });
    loadAccounts();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/research/accounts/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadAccounts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">⚙️ Session Cookie Pool</h3>
          <p className="text-sm text-gray-500">Manage the shared Pinterest session cookies for research</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Add Account
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <h4 className="font-semibold mb-2">How to get your session cookie:</h4>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Log into Pinterest in Chrome</li>
          <li>Open DevTools (F12) → Network tab</li>
          <li>Search anything on Pinterest, find any API request</li>
          <li>Copy the <strong>cookie</strong> header value (very long string)</li>
          <li>Copy the <strong>x-csrftoken</strong> header value</li>
          <li>Paste both below and click "Test Cookie" first!</li>
        </ol>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">❌ {error}</div>}

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
          <h4 className="font-semibold">Add New Account</h4>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Research Account #1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cookie</label>
            <textarea value={form.cookie} onChange={e => setForm({ ...form, cookie: e.target.value })} rows={3} placeholder="Paste full cookie string…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CSRF Token</label>
            <input value={form.csrfToken} onChange={e => setForm({ ...form, csrfToken: e.target.value })} placeholder="x-csrftoken value"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          {testResult && (
            <div className={`rounded-lg p-3 text-sm ${testResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {testResult.ok ? '✅' : '❌'} {testResult.message}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleTest} disabled={testing || saving}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {testing ? 'Testing…' : '🔍 Test Cookie'}
            </button>
            <button onClick={handleAdd} disabled={saving}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {saving ? 'Saving…' : 'Save Account'}
            </button>
            <button onClick={() => { setShowForm(false); setTestResult(null); }}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Account list */}
      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div> : (
        <div className="space-y-3">
          {accounts.map(a => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{a.label}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Last used: {a.lastUsedAt ? new Date(a.lastUsedAt).toLocaleString() : 'Never'} · Fails: {a.failCount}
                </div>
              </div>
              <div className="flex gap-2">
                {a.status !== 'active' && (
                  <button onClick={() => handleStatusChange(a.id, 'active')} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">Reactivate</button>
                )}
                <button onClick={() => handleDelete(a.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No accounts configured. Add one to start using Pinterest Research.</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sidebar Nav Items ────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; icon: string; group?: string }[] = [
  { id: 'keywords', label: 'Keyword Explorer', icon: '🔍', group: 'Research' },
  { id: 'pinSearch', label: 'Pin Search', icon: '📊', group: 'Research' },
  { id: 'accountExplorer', label: 'Account Explorer', icon: '👤', group: 'Pinterest' },
  { id: 'accountTracker', label: 'Account Tracker', icon: '📍', group: 'Pinterest' },
  { id: 'boardsManager', label: 'Boards Manager', icon: '📋', group: 'Pinterest' },
  { id: 'savedPins', label: 'Saved Pins', icon: '💾', group: 'Collection' },
  { id: 'settings', label: 'Settings', icon: '⚙️', group: 'System' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const PinterestResearch: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('keywords');
  const [savedPinIds, setSavedPinIds] = useState<Set<string>>(new Set());
  const [trackedUsernames, setTrackedUsernames] = useState<Set<string>>(new Set());
  const [savedPinsRefresh, setSavedPinsRefresh] = useState(0);

  // Load saved pins and tracked accounts on mount
  useEffect(() => {
    fetch('/api/research/saved-pins')
      .then(r => r.json())
      .then(d => setSavedPinIds(new Set((d.pins || []).map((p: any) => p.pinId))))
      .catch(() => {});
    fetch('/api/research/tracked-accounts')
      .then(r => r.json())
      .then(d => setTrackedUsernames(new Set((d.accounts || []).map((a: any) => a.username))))
      .catch(() => {});
  }, []);

  const handleSavePin = async (pin: any) => {
    try {
      await fetch('/api/research/saved-pins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pin),
      });
      setSavedPinIds(prev => new Set(prev).add(pin.pinId));
      setSavedPinsRefresh(n => n + 1);
    } catch {}
  };

  const handleRemoveSavedPin = (pinId: string) => {
    setSavedPinIds(prev => { const s = new Set(prev); s.delete(pinId); return s; });
  };

  const handleTrackAccount = async (profile: any) => {
    try {
      await fetch('/api/research/tracked-accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      setTrackedUsernames(prev => new Set(prev).add(profile.username));
    } catch {}
  };

  const handleExplore = (username: string) => {
    setActiveSection('accountExplorer');
  };

  // Group nav items
  const groups = NAV_ITEMS.reduce((acc, item) => {
    const g = item.group || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);

  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex-shrink-0 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">📌</div>
            <div>
              <h2 className="text-sm font-bold">Pinterest</h2>
              <p className="text-xs text-slate-400">Research Suite</p>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-4">
              <div className="px-3 mb-1 text-[10px] font-bold uppercase text-slate-500 tracking-wider">{group}</div>
              {items.map(item => (
                <button key={item.id} onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    activeSection === item.id
                      ? 'bg-red-600 text-white font-semibold shadow-lg shadow-red-900/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === 'savedPins' && savedPinIds.size > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{savedPinIds.size}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Saved pins counter */}
        <div className="p-3 border-t border-slate-700">
          <button onClick={() => setActiveSection('savedPins')}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            💾 Saved Pins <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{savedPinIds.size}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-6 px-6">
          {activeSection === 'keywords' && <KeywordExplorerSection />}
          {activeSection === 'pinSearch' && <PinSearchSection onSavePin={handleSavePin} savedPinIds={savedPinIds} />}
          {activeSection === 'accountExplorer' && (
            <AccountExplorerSection onTrackAccount={handleTrackAccount} trackedUsernames={trackedUsernames}
              onSavePin={handleSavePin} savedPinIds={savedPinIds} />
          )}
          {activeSection === 'accountTracker' && <AccountTrackerSection onExplore={handleExplore} />}
          {activeSection === 'boardsManager' && <BoardsManagerSection />}
          {activeSection === 'savedPins' && <SavedPinsSection refreshTrigger={savedPinsRefresh} onRemove={handleRemoveSavedPin} />}
          {activeSection === 'settings' && <SettingsSection />}
        </div>
      </main>
    </div>
  );
};

export default PinterestResearch;
