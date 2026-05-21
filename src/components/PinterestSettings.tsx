import React, { useState, useEffect } from 'react';
import { getPinterestAuthUrl, getPinterestBoards, PinterestBoard } from '../services/pinterestService';
import type { User, ToastType, ToastMessage } from '../types';
import { Icons } from '../constants';

interface PinterestSettingsProps {
    currentUser: User;
    onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    showToast: (config: string | ToastMessage, type?: ToastType) => void;
}

export const PinterestSettings: React.FC<PinterestSettingsProps> = ({ currentUser, onUpdateUser, showToast }) => {
    const [boards, setBoards] = useState<PinterestBoard[]>([]);
    const [isLoadingBoards, setIsLoadingBoards] = useState(false);
    const [pinterestUser, setPinterestUser] = useState<any>(null);

    const [isConnecting, setIsConnecting] = useState(false);
    const clientId = (import.meta as any).env.VITE_PINTEREST_APP_ID || '';
    const redirectUri = `${window.location.origin}/api/pinterest/callback`;

    useEffect(() => {
        if (currentUser.pinterestToken) {
            fetchBoards(currentUser.pinterestToken);
            fetchUserAccount(currentUser.pinterestToken);
        }
    }, [currentUser.pinterestToken]);

    const fetchUserAccount = async (token: string) => {
        try {
            const { getPinterestUserAccount } = await import('../services/pinterestService');
            const userData = await getPinterestUserAccount(token);
            setPinterestUser(userData);
        } catch (error) {
            console.error("Failed to fetch Pinterest user", error);
        }
    };

    const fetchBoards = async (token: string) => {
        setIsLoadingBoards(true);
        try {
            const fetchedBoards = await getPinterestBoards(token);
            setBoards(fetchedBoards);
        } catch (error) {
            console.error("Failed to fetch boards", error);
            showToast("Failed to fetch Pinterest boards. Token might be expired.", "error");
            onUpdateUser(currentUser.id, { pinterestToken: undefined, pinterestDefaultBoard: undefined });
        } finally {
            setIsLoadingBoards(false);
        }
    };

    const handleConnect = () => {
        if (!clientId) {
            showToast("Pinterest App ID is missing in environment variables.", "error");
            return;
        }
        
        setIsConnecting(true);
        const authUrl = getPinterestAuthUrl(clientId, redirectUri);
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(authUrl, 'pinterest_auth', `width=${width},height=${height},left=${left},top=${top}`);

        const handleAuthCode = async (code: string) => {
            try {
                const { exchangePinterestCodeForToken } = await import('../services/pinterestService');
                const tokenData = await exchangePinterestCodeForToken(code, redirectUri);
                if (tokenData.access_token) {
                    await onUpdateUser(currentUser.id, { pinterestToken: tokenData.access_token });
                    showToast("Successfully connected to Pinterest!", "success");
                }
            } catch (err: any) {
                showToast(err.message || 'Failed to exchange token', 'error');
            } finally {
                setIsConnecting(false);
            }
        };

        // We listen for a postMessage from the popup when it completes
        const handleMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'PINTEREST_AUTH_CODE') {
                window.removeEventListener('message', handleMessage);
                window.removeEventListener('storage', handleStorage);
                handleAuthCode(event.data.code);
            }
        };

        // Fallback for COOP restricted popups
        const handleStorage = async (e: StorageEvent) => {
            if (e.key === 'pinterest_auth_code' && e.newValue) {
                window.removeEventListener('storage', handleStorage);
                window.removeEventListener('message', handleMessage);
                const code = e.newValue;
                localStorage.removeItem('pinterest_auth_code'); // clean up
                handleAuthCode(code);
            }
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('storage', handleStorage);

        const checkPopup = setInterval(() => {
            if (!popup || popup.closed || popup.closed === undefined) {
                clearInterval(checkPopup);
                window.removeEventListener('message', handleMessage);
                window.removeEventListener('storage', handleStorage);
                setIsConnecting(false);
            }
        }, 1000);
    };

    const handleDisconnect = async () => {
        await onUpdateUser(currentUser.id, { pinterestToken: undefined, pinterestDefaultBoard: undefined });
        setBoards([]);
        showToast("Disconnected from Pinterest", "success");
    };

    const handleBoardChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        await onUpdateUser(currentUser.id, { pinterestDefaultBoard: e.target.value });
        showToast("Default board updated", "success");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        {Icons.pinterest}
                        Pinterest Integration
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Connect your Pinterest account to automatically publish generated pins.</p>
                </div>
            </div>

            <div className="space-y-6 text-left">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                    {!currentUser.pinterestToken ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                {Icons.pinterest}
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className={`bg-[#E60023] hover:bg-[#ad081b] text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-all focus:ring-4 focus:ring-red-100 ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isConnecting ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        Connecting...
                                    </div>
                                ) : 'Connect to Pinterest'}
                            </button>
                            <p className="text-xs text-slate-500 mt-3">You will be redirected to Pinterest to authorize this app.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                        {Icons.pinterest}
                                    </div>
                                    <div>
                                        <div className="text-green-800 font-bold truncate max-w-[120px] sm:max-w-none">
                                            {pinterestUser ? `Connected as ${pinterestUser.username}` : 'Connected'}
                                        </div>
                                        {pinterestUser?.follower_count !== undefined && (
                                            <div className="text-[10px] text-green-700 font-medium">
                                                {pinterestUser.follower_count.toLocaleString()} followers
                                            </div>
                                        )}
                                        <div className="text-xs text-green-600">Ready to publish pins</div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDisconnect}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                                >
                                    Disconnect
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Default Target Board</label>
                                {isLoadingBoards ? (
                                    <div className="animate-pulse h-10 bg-slate-100 rounded border border-slate-200"></div>
                                ) : (
                                    <select
                                        value={currentUser.pinterestDefaultBoard || ''}
                                        onChange={handleBoardChange}
                                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm p-2 bg-white"
                                    >
                                        <option value="" disabled>Select a board</option>
                                        {boards.map(board => (
                                            <option key={board.id} value={board.id}>{board.name}</option>
                                        ))}
                                    </select>
                                )}
                                <p className="text-[10px] text-slate-500 italic">This board will be pre-selected in the Creator tool.</p>
                            </div>
                        </div>
                    )}
                </div>


            </div>

            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <h3 className="text-md font-semibold text-slate-800 mb-4">AI Prompt Customization</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Pinterest Image Generation Prompt
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Variables available: <code>{'{title}'}</code>, <code>{'{keyword}'}</code></p>
                        <textarea
                            value={currentUser.pinterestImagePrompt || ''}
                            onChange={(e) => onUpdateUser(currentUser.id, { pinterestImagePrompt: e.target.value })}
                            placeholder="Photorealistic vertical image of {title}, delicious looking, bright lighting..."
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 bg-white"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Pinterest Description Generation Prompt
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Variables available: <code>{'{title}'}</code>, <code>{'{keyword}'}</code></p>
                        <textarea
                            value={currentUser.pinterestDescriptionPrompt || ''}
                            onChange={(e) => onUpdateUser(currentUser.id, { pinterestDescriptionPrompt: e.target.value })}
                            placeholder="Write an engaging and SEO-optimized Pinterest description for {title} focusing on the keyword {keyword}..."
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 bg-white"
                            rows={3}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
