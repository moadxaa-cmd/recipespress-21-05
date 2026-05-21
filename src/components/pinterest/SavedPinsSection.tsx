import React, { useState, useEffect } from 'react';

interface SavedPin {
  pinId: string; title: string; description: string; imageUrl: string;
  domain: string; createdAt: string; repinCount: number; reactionCount: number;
  commentCount: number; shareCount: number; isRepin: boolean; hasRecipe: boolean;
  pinner: { username: string; fullName: string; imageUrl: string };
  savedAt: string;
}

const fmt = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString();

const safeJson = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Non-JSON response');
  return res.json();
};

export const SavedPinsSection: React.FC<{ refreshTrigger: number; onRemove: (pinId: string) => void }> = ({ refreshTrigger, onRemove }) => {
  const [pins, setPins] = useState<SavedPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/research/saved-pins');
      const data = await safeJson(res);
      setPins(data.pins || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  const handleRemove = async (pinId: string) => {
    await fetch(`/api/research/saved-pins/${pinId}`, { method: 'DELETE' });
    setPins(prev => prev.filter(p => p.pinId !== pinId));
    onRemove(pinId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Saved Pins</h3>
          <p className="text-sm text-gray-500">Your collection of saved pins for reference and post generation</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm font-medium">💾 {pins.length} saved</span>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('grid')} className={`px-3 py-1 rounded text-sm ${view === 'grid' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>▦</button>
            <button onClick={() => setView('list')} className={`px-3 py-1 rounded text-sm ${view === 'list' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>☰</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading saved pins…</div>
      ) : pins.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">💾</div>
          <h4 className="text-lg font-semibold text-gray-600 mb-2">No saved pins yet</h4>
          <p className="text-sm text-gray-400">Save pins from Pin Search or Account Explorer to see them here.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pins.map(pin => (
            <div key={pin.pinId} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
              {pin.imageUrl ? (
                <img src={pin.imageUrl} alt="" className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-3xl text-gray-300">📌</div>
              )}
              <div className="p-3">
                <h5 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">{pin.title || 'Untitled'}</h5>
                {pin.domain && <p className="text-xs text-blue-500 mb-2">{pin.domain}</p>}
                <div className="flex gap-2 text-xs text-gray-500 mb-2">
                  <span>{fmt(pin.repinCount)} repins</span>
                  <span>{fmt(pin.commentCount)} comments</span>
                </div>
                <div className="flex gap-1.5">
                  <a href={`https://www.pinterest.com/pin/${pin.pinId}/`} target="_blank" rel="noreferrer"
                    className="flex-1 text-center bg-red-50 text-red-600 hover:bg-red-100 py-1.5 rounded-lg text-xs font-medium">View</a>
                  <button onClick={() => handleRemove(pin.pinId)}
                    className="flex-1 text-center bg-gray-50 text-gray-600 hover:bg-gray-100 py-1.5 rounded-lg text-xs font-medium">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Pin</th>
                <th className="text-center py-3 px-3 font-medium text-gray-600">Repins</th>
                <th className="text-center py-3 px-3 font-medium text-gray-600">Comments</th>
                <th className="text-center py-3 px-3 font-medium text-gray-600">Saved On</th>
                <th className="text-center py-3 px-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pins.map(pin => (
                <tr key={pin.pinId} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {pin.imageUrl && <img src={pin.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 line-clamp-1">{pin.title || 'Untitled'}</div>
                        <div className="text-xs text-gray-400">{pin.domain}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-3 px-3 font-semibold">{fmt(pin.repinCount)}</td>
                  <td className="text-center py-3 px-3">{fmt(pin.commentCount)}</td>
                  <td className="text-center py-3 px-3 text-xs text-gray-500">{new Date(pin.savedAt).toLocaleDateString()}</td>
                  <td className="text-center py-3 px-3">
                    <div className="flex gap-1 justify-center">
                      <a href={`https://www.pinterest.com/pin/${pin.pinId}/`} target="_blank" rel="noreferrer"
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">View</a>
                      <button onClick={() => handleRemove(pin.pinId)}
                        className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 hover:bg-gray-100">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SavedPinsSection;
