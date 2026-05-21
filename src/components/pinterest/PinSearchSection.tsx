import React, { useState } from 'react';

interface PinSearchResult {
  pinId: string; title: string; description: string; imageUrl: string;
  domain: string; createdAt: string; repinCount: number; reactionCount: number;
  commentCount: number; shareCount: number; isRepin: boolean; hasRecipe: boolean;
  pinner: { username: string; fullName: string; imageUrl: string };
}

const fmt = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString();

const safeJson = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Server returned a non-JSON response.');
  return res.json();
};

export const PinSearchSection: React.FC<{ onSavePin: (pin: PinSearchResult) => void; savedPinIds: Set<string> }> = ({ onSavePin, savedPinIds }) => {
  const [query, setQuery] = useState('');
  const [pins, setPins] = useState<PinSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minRepins, setMinRepins] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [sortKey, setSortKey] = useState<'repinCount' | 'reactionCount' | 'commentCount' | 'createdAt'>('repinCount');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setPins([]);
    try {
      const params = new URLSearchParams({ q: query });
      if (minRepins) params.set('minRepins', minRepins);
      if (domainFilter) params.set('domain', domainFilter);
      const res = await fetch(`/api/research/pins?${params}`);
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setPins(data.pins || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...pins].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const recipeCount = pins.filter(p => p.hasRecipe).length;
  const topDomain = pins.length ? (() => { const d: Record<string, number> = {}; pins.forEach(p => { if (p.domain) d[p.domain] = (d[p.domain]||0)+1; }); return Object.entries(d).sort((a,b) => b[1]-a[1])[0]?.[0] || ''; })() : '';

  const SortIcon = ({ k }: { k: typeof sortKey }) => sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : '';

  return (
    <div>
      {/* Search bar */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-6 mb-6">
        <div className="flex justify-center gap-3 mb-4">
          <button className="bg-red-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow">🔍 Search Pins</button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search for pins..." className="w-full pl-10 pr-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg text-sm font-bold shadow whitespace-nowrap">
            {loading ? 'Searching…' : 'Find Best Pins'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">❌ {error}</div>}

      {pins.length > 0 && (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">ℹ️ {pins.length} pins</span>
            {recipeCount > 0 && <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">🍳 {recipeCount} recipes</span>}
            {topDomain && <span className="text-gray-500">🌐 top domain: <strong>{topDomain}</strong></span>}
          </div>

          {/* Insights */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {recipeCount > 0 && <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">✅ Found recipe content - great if you share cooking tips</span>}
            {pins.length >= 20 && <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">➕ Lots of inspiration available for this topic</span>}
          </div>

          {/* Quick filters */}
          <div className="flex gap-2 mb-4 flex-wrap items-center text-sm">
            <span className="text-gray-500 font-medium">Quick Filters:</span>
            <input placeholder="Min repins…" value={minRepins} onChange={e => setMinRepins(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-red-300" />
            <input placeholder="Filter by domain…" value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-red-300" />
            <button onClick={handleSearch} className="text-red-600 hover:text-red-800 font-medium text-sm">Apply</button>
          </div>

          {/* Results table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 w-[340px]">Pin</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('createdAt')}>📅 Date<SortIcon k="createdAt" /></th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('repinCount')}>Repins<SortIcon k="repinCount" /></th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('reactionCount')}>Reactions<SortIcon k="reactionCount" /></th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('commentCount')}>Comments<SortIcon k="commentCount" /></th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Recipe</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">isRepin</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(pin => (
                  <tr key={pin.pinId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {pin.imageUrl && <img src={pin.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                        <div className="min-w-0">
                          <a href={`https://www.pinterest.com/pin/${pin.pinId}/`} target="_blank" rel="noreferrer"
                            className="font-medium text-gray-900 hover:text-red-600 line-clamp-1 block">{pin.title || 'Untitled Pin'}</a>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            {pin.domain && <span className="text-blue-500">{pin.domain}</span>}
                            {pin.pinner?.username && <span>• @{pin.pinner.username}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">{pin.createdAt ? new Date(pin.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-800">{fmt(pin.repinCount)}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{fmt(pin.reactionCount)}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{fmt(pin.commentCount)}</td>
                    <td className="py-3 px-2 text-center">{pin.hasRecipe ? <span className="text-green-500">✓</span> : <span className="text-gray-300">✗</span>}</td>
                    <td className="py-3 px-2 text-center">{pin.isRepin ? <span className="text-green-500">✓</span> : <span className="text-gray-300">✗</span>}</td>
                    <td className="py-3 px-2 text-center">
                      <button onClick={() => onSavePin(pin)} disabled={savedPinIds.has(pin.pinId)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${savedPinIds.has(pin.pinId) ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        {savedPinIds.has(pin.pinId) ? '✓ Saved' : '💾 Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right text-xs text-gray-400 mt-2">Showing {sorted.length} of {pins.length} pins</div>
        </>
      )}

      {!loading && !error && pins.length === 0 && query && (
        <div className="text-center text-gray-400 py-12">No pins found for "{query}". Try a different search term.</div>
      )}
    </div>
  );
};

export default PinSearchSection;
