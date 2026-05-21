import React, { useState, useEffect } from 'react';

interface Board { id: string; name: string; pinterestId: string | null; isActive: boolean; pinCount?: number; addedAt: string; }
interface BoardGroup { id: string; name: string; boards: Board[]; isDefault: boolean; createdAt: string; }

const safeJson = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Non-JSON response');
  return res.json();
};

export const BoardsManagerSection: React.FC = () => {
  const [groups, setGroups] = useState<BoardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddBoard, setShowAddBoard] = useState<string | null>(null); // groupId
  const [newBoardName, setNewBoardName] = useState('');
  const [showFetch, setShowFetch] = useState<string | null>(null); // groupId
  const [fetchUsername, setFetchUsername] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/research/boards-manager');
      const data = await safeJson(res);
      setGroups(data.groups || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/research/boards-manager/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error);
      setNewGroupName(''); setShowAddGroup(false); load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this board group?')) return;
    await fetch(`/api/research/boards-manager/groups/${id}`, { method: 'DELETE' });
    load();
  };

  const handleAddBoard = async (groupId: string) => {
    if (!newBoardName.trim()) return;
    try {
      const res = await fetch(`/api/research/boards-manager/groups/${groupId}/boards`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName }),
      });
      await safeJson(res);
      setNewBoardName(''); setShowAddBoard(null); load();
    } catch {}
  };

  const handleToggleBoard = async (groupId: string, boardId: string, isActive: boolean) => {
    await fetch(`/api/research/boards-manager/groups/${groupId}/boards/${boardId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  };

  const handleDeleteBoard = async (groupId: string, boardId: string) => {
    await fetch(`/api/research/boards-manager/groups/${groupId}/boards/${boardId}`, { method: 'DELETE' });
    load();
  };

  const handleFetchFromPinterest = async (groupId: string) => {
    if (!fetchUsername.trim()) return;
    setFetching(true); setError('');
    try {
      const res = await fetch(`/api/research/boards-manager/groups/${groupId}/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fetchUsername.replace(/^@/, '') }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error);
      setFetchUsername(''); setShowFetch(null); load();
    } catch (e: any) { setError(e.message); }
    finally { setFetching(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📌</span>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pinterest Boards Manager</h3>
            <p className="text-sm text-gray-500">Manage your custom Pinterest boards for content scheduling</p>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h4 className="text-blue-700 font-semibold text-sm mb-2">ℹ️ How Pinterest Boards Manager Works</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
          <div>• Add your custom Pinterest board names that match your actual Pinterest boards</div>
          <div>• Boards are organized by niche (food, general, etc.)</div>
          <div>• The AI will select the most appropriate board from your list when generating content</div>
          <div>• Inactive boards won't be used for content generation</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 justify-end flex-wrap">
        <button onClick={() => setShowAddGroup(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          🏷️ Add Board Group
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">❌ {error}</div>}

      {/* Add Group form */}
      {showAddGroup && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <h4 className="font-semibold text-sm mb-3">Create New Board Group</h4>
          <div className="flex gap-2">
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name (e.g. Food, Fashion…)"
              onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <button onClick={handleAddGroup} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Create</button>
            <button onClick={() => setShowAddGroup(false)} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading boards…</div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h4 className="text-lg font-semibold text-gray-600 mb-2">No board groups yet</h4>
          <p className="text-sm text-gray-400">Create a board group to start organizing your Pinterest boards.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">📌</span>
                  <span className="font-semibold text-gray-900">{group.name}</span>
                  {group.isDefault && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Default</span>}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{group.boards.filter(b => b.isActive).length} active</span>
                  <span>{group.boards.filter(b => !b.isActive).length} inactive</span>
                  <span>{group.boards.length} total</span>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => { setShowFetch(group.id); setFetchUsername(''); }}
                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 font-medium">
                      📌 Fetch from Pinterest
                    </button>
                    <button onClick={() => { setShowAddBoard(group.id); setNewBoardName(''); }}
                      className="text-teal-600 hover:text-teal-800 text-xs px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 font-medium">
                      + Add Board
                    </button>
                    <button onClick={() => handleDeleteGroup(group.id)}
                      className="text-gray-400 hover:text-red-500 p-1">🗑️</button>
                  </div>
                </div>
              </div>

              {/* Fetch from Pinterest form */}
              {showFetch === group.id && (
                <div className="px-5 py-3 bg-red-50 border-b flex gap-2 items-center">
                  <span className="text-sm text-gray-600">Pinterest username:</span>
                  <input value={fetchUsername} onChange={e => setFetchUsername(e.target.value)} placeholder="@username"
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-red-300" />
                  <button onClick={() => handleFetchFromPinterest(group.id)} disabled={fetching}
                    className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
                    {fetching ? 'Fetching…' : '📥 Fetch Boards'}
                  </button>
                  <button onClick={() => setShowFetch(null)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                </div>
              )}

              {/* Add board form */}
              {showAddBoard === group.id && (
                <div className="px-5 py-3 bg-teal-50 border-b flex gap-2 items-center">
                  <span className="text-sm text-gray-600">Board name:</span>
                  <input value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="e.g. Dinner Recipes"
                    onKeyDown={e => e.key === 'Enter' && handleAddBoard(group.id)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-teal-300" />
                  <button onClick={() => handleAddBoard(group.id)} className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">Add</button>
                  <button onClick={() => setShowAddBoard(null)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                </div>
              )}

              {/* Boards list */}
              {group.boards.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-2 px-5 font-medium text-gray-500">Board Name</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500">Status</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500">Source</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.boards.map(board => (
                      <tr key={board.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-5 font-medium text-gray-800">{board.name}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button onClick={() => handleToggleBoard(group.id, board.id, board.isActive)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${board.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {board.isActive ? '✓ Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs text-gray-400">
                          {board.pinterestId ? '📌 Pinterest' : '✏️ Manual'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button onClick={() => handleDeleteBoard(group.id, board.id)}
                            className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">
                  No boards in this group. Use "Fetch from Pinterest" or "Add Board" to get started.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BoardsManagerSection;
