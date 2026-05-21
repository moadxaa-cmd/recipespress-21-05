import React, { useState, useEffect } from 'react';

interface TrackedAccount {
  username: string; fullName: string; imageUrl: string;
  followerCount: number; pinCount: number; profileViews: number;
  trackedAt: string;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toString();
};

const safeJson = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Non-JSON response');
  return res.json();
};

export const AccountTrackerSection: React.FC<{ onExplore: (username: string) => void }> = ({ onExplore }) => {
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/research/tracked-accounts');
      const data = await safeJson(res);
      setAccounts(data.accounts || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (username: string) => {
    await fetch(`/api/research/tracked-accounts/${encodeURIComponent(username)}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.username !== username));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Pinterest Account Tracker</h3>
          <p className="text-sm text-gray-500">Track and analyze your favorite Pinterest accounts</p>
        </div>
        <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">🎯 {accounts.length} tracked accounts</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading tracked accounts…</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📌</div>
          <h4 className="text-lg font-semibold text-red-600 mb-2">No tracked accounts found</h4>
          <p className="text-sm text-gray-500 mb-4">Start tracking accounts from the Account Explorer to see them here.</p>
          <button onClick={() => onExplore('')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
            🔍 Go to Account Explorer
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map(a => (
            <div key={a.username} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              {a.imageUrl ? (
                <img src={a.imageUrl} alt={a.username} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                  {(a.fullName || a.username).charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{a.fullName || a.username}</div>
                <div className="text-sm text-gray-500">@{a.username}</div>
                <div className="text-xs text-gray-400 mt-0.5">Tracked since {new Date(a.trackedAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-3 text-center">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-sm font-bold text-gray-800">{fmt(a.followerCount)}</div>
                  <div className="text-xs text-gray-400">Followers</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-sm font-bold text-gray-800">{fmt(a.pinCount)}</div>
                  <div className="text-xs text-gray-400">Pins</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-sm font-bold text-gray-800">{fmt(a.profileViews)}</div>
                  <div className="text-xs text-gray-400">Views</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onExplore(a.username)} className="text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium">🔍 Explore</button>
                <button onClick={() => handleRemove(a.username)} className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountTrackerSection;
