import React, { useState, useEffect } from 'react';

interface PinSearchResult {
  pinId: string; title: string; description: string; imageUrl: string;
  domain: string; createdAt: string; repinCount: number; reactionCount: number;
  commentCount: number; shareCount: number; isRepin: boolean; hasRecipe: boolean;
  pinner: { username: string; fullName: string; imageUrl: string };
}

interface Profile {
  username: string; fullName: string; bio: string; imageUrl: string;
  followerCount: number; profileViews: number; pinCount: number; boardCount: number;
  isVerified: boolean; websiteUrl: string;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toString();
};

const safeJson = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Server returned a non-JSON response.');
  return res.json();
};

export const AccountExplorerSection: React.FC<{
  onTrackAccount: (profile: Profile) => void;
  trackedUsernames: Set<string>;
  onSavePin: (pin: PinSearchResult) => void;
  savedPinIds: Set<string>;
}> = ({ onTrackAccount, trackedUsernames, onSavePin, savedPinIds }) => {
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pins, setPins] = useState<PinSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPins, setLoadingPins] = useState(false);
  const [error, setError] = useState('');
  const [bookmark, setBookmark] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<PinSearchResult | null>(null);

  const handleSearch = async () => {
    const u = username.replace(/^@/, '').trim();
    if (!u) return;
    setLoading(true); setError(''); setProfile(null); setPins([]); setBookmark(null);
    try {
      const res = await fetch(`/api/research/profile/${encodeURIComponent(u)}`);
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Profile not found');
      setProfile(data.profile);
      // Auto-load pins
      setLoadingPins(true);
      const pinsRes = await fetch(`/api/research/profile/${encodeURIComponent(u)}/pins`);
      const pinsData = await safeJson(pinsRes);
      if (pinsRes.ok) { setPins(pinsData.pins || []); setBookmark(pinsData.bookmark || null); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setLoadingPins(false); }
  };

  const loadMore = async () => {
    if (!profile || !bookmark) return;
    setLoadingPins(true);
    try {
      const res = await fetch(`/api/research/profile/${encodeURIComponent(profile.username)}/pins?bookmark=${encodeURIComponent(bookmark)}`);
      const data = await safeJson(res);
      if (res.ok) { setPins(prev => [...prev, ...(data.pins || [])]); setBookmark(data.bookmark || null); }
    } catch {}
    finally { setLoadingPins(false); }
  };

  return (
    <div>
      {/* Search header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-6 mb-6">
        <h3 className="text-white font-bold text-lg mb-3 text-center">Pinterest Account Explorer</h3>
        <div className="flex gap-2 max-w-xl mx-auto">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
            <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Pinterest username…" className="w-full pl-8 pr-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg text-sm font-bold">
            {loading ? 'Loading…' : '🔍 Analyze'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">❌ {error}</div>}

      {/* Profile card */}
      {profile && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              {profile.imageUrl ? (
                <img src={profile.imageUrl} alt={profile.username} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                  {profile.fullName.charAt(0) || '?'}
                </div>
              )}
              {profile.isVerified && <div className="text-center mt-1"><span className="text-green-500 text-xs font-semibold">✓ Verified</span></div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-900">{profile.fullName || profile.username}</h3>
                {profile.isVerified && <span className="text-green-500">✓</span>}
              </div>
              <p className="text-sm text-gray-500">@{profile.username}</p>
              {profile.websiteUrl && (
                <a href={profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`}
                  target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{profile.websiteUrl}</a>
              )}
              {profile.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{profile.bio}</p>}
            </div>
            <div className="flex gap-4 flex-shrink-0">
              <div className="text-center bg-blue-50 rounded-lg px-4 py-3">
                <div className="text-lg font-bold text-blue-700">{fmt(profile.followerCount)}</div>
                <div className="text-xs text-blue-500">Followers</div>
              </div>
              <div className="text-center bg-purple-50 rounded-lg px-4 py-3">
                <div className="text-lg font-bold text-purple-700">{fmt(profile.profileViews)}</div>
                <div className="text-xs text-purple-500">Profile Views</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => onTrackAccount(profile)} disabled={trackedUsernames.has(profile.username)}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${trackedUsernames.has(profile.username) ? 'bg-gray-100 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
              {trackedUsernames.has(profile.username) ? '✓ Tracked' : '📍 Track Account'}
            </button>
            <a href={`https://www.pinterest.com/${profile.username}/`} target="_blank" rel="noreferrer"
              className="text-sm px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">🔗 View Profile</a>
          </div>
        </div>
      )}

      {/* Pin detail popup */}
      {selectedPin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPin(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {selectedPin.imageUrl && <img src={selectedPin.imageUrl} alt="" className="w-full h-64 object-cover" />}
            <div className="p-5">
              <h4 className="font-bold text-lg mb-1">{selectedPin.title || 'Untitled Pin'}</h4>
              {selectedPin.domain && <p className="text-xs text-blue-500 mb-2">{selectedPin.domain}</p>}
              {selectedPin.description && <p className="text-sm text-gray-600 mb-3 line-clamp-4">{selectedPin.description}</p>}
              <div className="flex gap-4 text-sm text-gray-500 mb-4">
                <span>{fmt(selectedPin.repinCount)} Repins</span>
                <span>{fmt(selectedPin.reactionCount)} Reactions</span>
                <span>{fmt(selectedPin.commentCount)} Comments</span>
              </div>
              <div className="flex gap-2">
                <a href={`https://www.pinterest.com/pin/${selectedPin.pinId}/`} target="_blank" rel="noreferrer"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">🔗 View Pin</a>
                <button onClick={() => { onSavePin(selectedPin); }} disabled={savedPinIds.has(selectedPin.pinId)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                  {savedPinIds.has(selectedPin.pinId) ? '✓ Saved' : '💾 Save'}
                </button>
                <button onClick={() => setSelectedPin(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pins table */}
      {pins.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Pin</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">📅 Date</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Repins</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Reactions</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Comments</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Recipe</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pins.map(pin => (
                <tr key={pin.pinId} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedPin(pin)}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {pin.imageUrl && <img src={pin.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 line-clamp-1">{pin.title || 'Untitled'}</div>
                        <div className="text-xs text-gray-400">{pin.domain}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">{pin.createdAt ? new Date(pin.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="py-3 px-2 text-center font-semibold">{fmt(pin.repinCount)}</td>
                  <td className="py-3 px-2 text-center">{fmt(pin.reactionCount)}</td>
                  <td className="py-3 px-2 text-center">{fmt(pin.commentCount)}</td>
                  <td className="py-3 px-2 text-center">{pin.hasRecipe ? <span className="text-green-500">✓</span> : <span className="text-gray-300">✗</span>}</td>
                  <td className="py-3 px-2 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onSavePin(pin)} disabled={savedPinIds.has(pin.pinId)}
                      className={`text-xs px-2 py-1 rounded-full ${savedPinIds.has(pin.pinId) ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                      {savedPinIds.has(pin.pinId) ? '✓' : '💾'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bookmark && (
        <div className="text-center mt-4">
          <button onClick={loadMore} disabled={loadingPins} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium">
            {loadingPins ? 'Loading…' : 'Load More Pins'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountExplorerSection;
