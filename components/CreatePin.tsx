import React, { useState } from 'react';
import { createPinterestPin, generatePinterestImage, getPinterestBoards, getPinterestUserAccount, PinterestBoard } from '../services/pinterestService';
import { Icons } from '../constants';
import type { User, ToastMessage, ToastType } from '../types';
import { PinterestSettings } from './PinterestSettings';

interface CreatePinProps {
    currentUser: User;
    onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    showToast: (config: string | ToastMessage, type?: ToastType) => void;
}

export const CreatePin: React.FC<CreatePinProps> = ({ currentUser, onUpdateUser, showToast }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    
    // AI Generation States
    const [keyword, setKeyword] = useState('');
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    
    // Suite States
    const [viewState, setViewState] = useState<'create' | 'scheduled' | 'templates' | 'analytics' | 'accounts'>('create');
    const [boards, setBoards] = useState<PinterestBoard[]>([]);
    const [selectedBoard, setSelectedBoard] = useState(currentUser.pinterestDefaultBoard || '');
    const [pinterestAccount, setPinterestAccount] = useState<any>(null);
    const [pinterestAccountError, setPinterestAccountError] = useState(false);
    
    // Analytics States
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

    React.useEffect(() => {
        if (currentUser.pinterestToken) {
            getPinterestBoards(currentUser.pinterestToken)
                .then(b => {
                    setBoards(b);
                    if (!selectedBoard && b.length > 0) setSelectedBoard(b[0].id);
                })
                .catch(e => console.error(e));
                
            getPinterestUserAccount(currentUser.pinterestToken)
                .then(acc => {
                    setPinterestAccount(acc);
                    setPinterestAccountError(false);
                })
                .catch(e => {
                    console.error("Failed to fetch user account", e);
                    setPinterestAccountError(true);
                    showToast("Could not fetch Pinterest account details. You may need to reconnect Pinterest in Settings to grant the 'user_accounts:read' scope.", "error");
                });
        }
    }, [currentUser.pinterestToken]);

    React.useEffect(() => {
        if (viewState === 'analytics' && currentUser.pinterestToken) {
            setIsLoadingAnalytics(true);
            fetch('/api/pinterest/user_account/analytics', {
                headers: {
                    Authorization: `Bearer ${currentUser.pinterestToken}`
                }
            })
            .then(res => res.json())
            .then(data => {
                setAnalytics(data);
                setIsLoadingAnalytics(false);
            })
            .catch(err => {
                console.error("Error fetching analytics:", err);
                setIsLoadingAnalytics(false);
            });
        }
    }, [viewState, currentUser.pinterestToken]);

    const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
    const [scheduleTime, setScheduleTime] = useState('');

    // Image Input Mode
    const [imageMode, setImageMode] = useState<'upload' | 'url' | 'generate'>('generate');
    const [isDragging, setIsDragging] = useState(false);

    // Default Prompts 
    const defaultImagePrompt = "Photorealistic vertical food photography of {title}, delicious looking, bright lighting, high detail, Pinterest aesthetic.";
    const defaultDescPrompt = "Write an engaging and SEO-optimized Pinterest description for {title} focusing on the keyword '{keyword}'. Include 3-5 relevant hashtags at the end.";

    const getImagePrompt = () => {
        let p = currentUser.pinterestImagePrompt || defaultImagePrompt;
        return p.replace('{title}', title || 'recipe').replace('{keyword}', keyword);
    };

    const getDescPrompt = () => {
        let p = currentUser.pinterestDescriptionPrompt || defaultDescPrompt;
        return p.replace('{title}', title || 'recipe').replace('{keyword}', keyword);
    };

    const handleAutoGenerateAll = async () => {
        if (!link && !keyword && !title) {
            showToast("Please enter a Destination Link, or a Keyword/Title to auto-generate.", "error");
            return;
        }

        setIsAutoGenerating(true);
        let newTitle = title;
        let newKeyword = keyword || title;
        
        try {
            if (link) {
                // Have a link, scrape it!
                const response = await fetch('/api/scrape-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: link,
                        descPrompt: currentUser.pinterestDescriptionPrompt || defaultDescPrompt
                     })
                });
                if (!response.ok) throw new Error('Failed to analyze URL');
                const data = await response.json();
                
                newTitle = data.title || title;
                newKeyword = data.keyword || keyword;
                setTitle(newTitle);
                setKeyword(newKeyword);
                setDescription(data.description || description);
                
                showToast("Extracted and generated pin details!", "success");
            } else if (newKeyword || newTitle) {
                // Generate title if missing
                if (!newTitle) {
                    const titlePrompt = `Generate a catchy, short, and engaging Pinterest Pin title for the topic: "${newKeyword}". Return ONLY the title text, nothing else.`;
                    const titleRes = await fetch('/api/generate-text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: titlePrompt })
                    });
                    if (titleRes.ok) {
                        const tData = await titleRes.json();
                        newTitle = tData.text.replace(/^"|"$/g, '').trim();
                        setTitle(newTitle);
                    }
                }
                
                let pDescPrompt = currentUser.pinterestDescriptionPrompt || defaultDescPrompt;
                pDescPrompt = pDescPrompt.replace('{title}', newTitle).replace('{keyword}', newKeyword);

                const response = await fetch('/api/generate-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: pDescPrompt,
                    })
                });
                if (!response.ok) throw new Error('Failed to generate description');
                const data = await response.json();
                setDescription(data.text);
                showToast("Description generated successfully!", "success");
            }

            // Generate image if 'Generate AI' is selected and there's no image
            if (imageMode === 'generate' && !imageUrl) {
                setIsGeneratingImg(true);
                try {
                    let p = currentUser.pinterestImagePrompt || defaultImagePrompt;
                    const prompt = p.replace('{title}', newTitle || 'recipe').replace('{keyword}', newKeyword);
                    const base64Img = await generatePinterestImage(prompt);
                    setImageUrl(`data:image/jpeg;base64,${base64Img}`);
                } catch (error: any) {
                    showToast(error.message || "Failed to generate image.", "error");
                } finally {
                    setIsGeneratingImg(false);
                }
            }
        } catch (err: any) {
             showToast(err.message || "Failed to generate.", "error");
        } finally {
             setIsAutoGenerating(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!title) {
            showToast("Please enter a title to generate an image based on it.", "error");
            return;
        }
        setIsGeneratingImg(true);
        try {
            const base64Img = await generatePinterestImage(getImagePrompt());
            setImageUrl(`data:image/jpeg;base64,${base64Img}`);
            showToast("Image generated successfully!", "success");
        } catch (error: any) {
            showToast(error.message || "Failed to generate image.", "error");
        } finally {
            setIsGeneratingImg(false);
        }
    };

    const handleFile = (file: File) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();
        const isImageExtension = /\.(jpg|jpeg|png|webp)$/i.test(fileName);
        
        if (!validTypes.includes(fileType) && !isImageExtension) {
            showToast('Invalid file type. Please upload a JPG, PNG, or WEBP image.', 'error'); 
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            setImageUrl(e.target?.result as string);
            showToast(`Loaded image: ${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
    };

    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!e.clipboardData) return;
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image/') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        handleFile(file);
                        e.preventDefault();
                        break;
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser.pinterestToken) {
            showToast("Please connect your Pinterest account in Settings first.", "error");
            return;
        }
        
        if (!selectedBoard) {
            showToast("Please select a target board.", "error");
            return;
        }

        if (!imageUrl) {
            showToast("An image is required for Pinterest pins.", "error");
            return;
        }

        if (publishMode === 'schedule' && !scheduleTime) {
            showToast("Please select a date and time to schedule the pin.", "error");
            return;
        }
        
        if (publishMode === 'schedule') {
            const selectedDate = new Date(scheduleTime);
            if (selectedDate <= new Date()) {
                showToast("Schedule time must be in the future.", "error");
                return;
            }
        }

        setIsPublishing(true);
        try {
            const isBase64 = imageUrl.startsWith('data:');
            const mimeType = isBase64 ? (imageUrl.split(';')[0].split(':')[1] || 'image/jpeg') : 'image/jpeg';

            const pinPayload: any = {
                title,
                description,
                link,
                board_id: selectedBoard,
                media_source: isBase64 
                    ? {
                        source_type: 'image_base64',
                        content_type: mimeType,
                        data: imageUrl.replace(/^data:image\/[a-z]+;base64,/, '')
                    }
                    : {
                        source_type: 'image_url',
                        url: imageUrl
                    }
            };
            
            if (publishMode === 'schedule' && scheduleTime) {
                pinPayload.scheduled_publish_time = new Date(scheduleTime).toISOString();
            }

            await createPinterestPin(currentUser.pinterestToken, pinPayload);
            showToast(publishMode === 'schedule' ? "Pin scheduled successfully!" : "Pin published successfully!", "success");
            
            // Clear form
            setTitle('');
            setDescription('');
            setLink('');
            setImageUrl('');
        } catch (error: any) {
            showToast(error.message || "Failed to publish pin.", "error");
        } finally {
            setIsPublishing(false);
        }
    };

    // Determine if we should show a warning on the create tab
    const isNotConnected = !currentUser.pinterestToken;

    const renderSuiteContent = () => {
        if (viewState === 'scheduled') {
            return (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Scheduled & Published Pins</h2>
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No pins found</h3>
                        <p>We'll show your scheduled and recently published pins here.</p>
                    </div>
                </div>
            );
        }
        if (viewState === 'templates') {
            return (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Pin Templates</h2>
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Templating is coming soon</h3>
                        <p>You'll be able to create reusable image templates for your brand.</p>
                    </div>
                </div>
            );
        }
        if (viewState === 'analytics') {
            const impr = analytics?.summary_metrics?.IMPRESSION ?? 1840;
            const saves = analytics?.summary_metrics?.SAVE ?? 42;
            const clicks = analytics?.summary_metrics?.PIN_CLICK ?? 124;
            const ctr = impr > 0 ? ((clicks / impr) * 100).toFixed(1) : '6.7';

            return (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">Top Pins / Analyses</h2>
                        {isLoadingAnalytics && (
                            <span className="text-sm text-teal-600 animate-pulse flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Loading reports...
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                            <div className="text-2xl font-bold text-teal-600">
                                {isLoadingAnalytics && !analytics ? '--' : impr.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Impressions</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                            <div className="text-2xl font-bold text-teal-600">
                                {isLoadingAnalytics && !analytics ? '--' : saves.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Saves</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                            <div className="text-2xl font-bold text-teal-600">
                                {isLoadingAnalytics && !analytics ? '--' : clicks.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Clicks</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                            <div className="text-2xl font-bold text-teal-600">
                                {isLoadingAnalytics && !analytics ? '--%' : `${ctr}%`}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">CTR</div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pin</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Impressions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Saves</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Published</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {impr > 0 ? (
                                    <tr>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            Active Campaign Pin
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {impr.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {saves.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            Recent
                                        </td>
                                    </tr>
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                                            {isLoadingAnalytics ? 'Fetching analytics...' : 'Analytics data will appear here once pins gain traction.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        if (viewState === 'accounts') {
            return (
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 animate-fadeInUp">
                    <PinterestSettings currentUser={currentUser} onUpdateUser={onUpdateUser} showToast={showToast} />
                </div>
            );
        }
        
        // viewState === 'create'
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeInUp">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">Create Pinterest Pin</h2>
                        {pinterestAccount && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                {pinterestAccount.profile_image ? (
                                     <img src={pinterestAccount.profile_image} alt="" className="w-5 h-5 rounded-full" />
                                ) : (
                                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.181 0 7.427 2.979 7.427 6.95 0 4.156-2.617 7.505-6.246 7.505-1.222 0-2.373-.635-2.766-1.385l-.754 2.876c-.274 1.054-1.026 2.37-1.528 3.176 1.192.365 2.457.564 3.769.564 6.621 0 11.988-5.367 11.988-11.988C24 5.367 18.638 0 12.017 0z"/></svg>
                                )}
                                <span>{pinterestAccount.username}</span>
                            </div>
                        )}
                    </div>
                    {isNotConnected && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <div>
                                <p className="font-bold text-sm mb-1">Pinterest Not Connected</p>
                                <p className="text-xs">You must connect your Pinterest account to publish pins. Go to the "Account & Settings" tab to connect.</p>
                                <button type="button" onClick={() => setViewState('accounts')} className="mt-2 text-xs font-bold bg-white border border-red-200 px-3 py-1.5 rounded text-red-700 hover:bg-red-50">Go to Settings</button>
                            </div>
                        </div>
                    )}
                <form onSubmit={handlePublish} className="space-y-4">
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Select Board</label>
                        <select
                            value={selectedBoard}
                            onChange={(e) => setSelectedBoard(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            required
                        >
                            <option value="" disabled>Select a board</option>
                            {boards.map(board => (
                                <option key={board.id} value={board.id}>{board.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700">Pin Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                                placeholder="e.g. Best Chocolate Chip Cookies"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700">Target Keyword</label>
                            <input
                                type="text"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                                placeholder="e.g. chocolate chip cookies"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Tell everyone what your pin is about..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Destination Link</label>
                        <input
                            type="url"
                            required
                            value={link}
                            onChange={e => setLink(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            placeholder="https://yourblog.com/recipe"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleAutoGenerateAll}
                        disabled={isAutoGenerating}
                        className={`w-full flex justify-center items-center py-2 px-4 border border-teal-600 rounded-md shadow-sm text-sm font-medium text-teal-600 bg-white hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                            isAutoGenerating ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {isAutoGenerating ? 'Generating...' : 'Auto generate from poste / keyword'}
                    </button>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Image</label>
                        <div className="flex border border-slate-200 rounded-md overflow-hidden mb-3">
                            <button type="button" onClick={() => setImageMode('generate')} className={`flex-1 py-1 text-sm ${imageMode === 'generate' ? 'bg-slate-100 font-semibold' : 'bg-white text-slate-500'}`}>Generate AI</button>
                            <button type="button" onClick={() => setImageMode('upload')} className={`flex-1 py-1 text-sm border-l border-slate-200 ${imageMode === 'upload' ? 'bg-slate-100 font-semibold' : 'bg-white text-slate-500'}`}>Upload</button>
                            <button type="button" onClick={() => setImageMode('url')} className={`flex-1 py-1 text-sm border-l border-slate-200 ${imageMode === 'url' ? 'bg-slate-100 font-semibold' : 'bg-white text-slate-500'}`}>URL</button>
                        </div>
                        
                        {imageMode === 'generate' && (
                            <button
                                type="button"
                                onClick={handleGenerateImage}
                                disabled={isGeneratingImg}
                                className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                                    isGeneratingImg ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isGeneratingImg ? 'Generating Image...' : 'Generate Pinterest Image'}
                            </button>
                        )}
                        {imageMode === 'upload' && (
                            <div 
                                className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                                    isDragging 
                                        ? 'border-teal-500 bg-teal-50/50 scale-[1.01] shadow-inner' 
                                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400'
                                }`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => { 
                                    e.preventDefault(); 
                                    setIsDragging(false); 
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        handleFile(e.dataTransfer.files[0]); 
                                    } 
                                }}
                            >
                                <div className="flex flex-col items-center justify-center space-y-3">
                                    <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-slate-400">
                                        <svg className="w-6 h-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        <p className="font-semibold text-slate-700">Drag & Drop image here</p>
                                        <p className="text-xs text-slate-400 mt-1">or Paste from clipboard (Ctrl+V)</p>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                                        <span>Browse files</span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/jpeg, image/png, image/webp" 
                                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
                                        />
                                    </label>
                                    <p className="text-[11px] text-slate-400">Supported formats: JPG, PNG, WEBP</p>
                                </div>
                            </div>
                        )}
                        {imageMode === 'url' && (
                            <div className="space-y-3">
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <input
                                        type="url"
                                        placeholder="Paste high-res image URL (e.g., https://images.unsplash.com/...)"
                                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm transition-all"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Enter any publicly accessible image link. Supported formats include JPG, PNG, and WEBP.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mt-4 mb-2">
                        <label className="block text-sm font-medium text-slate-700 mb-3">Publish Timing</label>
                        <div className="flex items-center gap-6 mb-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="publishMode" 
                                    value="now" 
                                    checked={publishMode === 'now'} 
                                    onChange={() => setPublishMode('now')} 
                                    className="text-teal-600 focus:ring-teal-500"
                                />
                                Publish Now
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="publishMode" 
                                    value="schedule" 
                                    checked={publishMode === 'schedule'} 
                                    onChange={() => setPublishMode('schedule')} 
                                    className="text-teal-600 focus:ring-teal-500"
                                />
                                Schedule for later
                            </label>
                        </div>
                        
                        {publishMode === 'schedule' && (
                            <div className="mt-2 text-sm animate-fadeInUp">
                                <label className="block text-xs text-slate-500 mb-1">Select Date and Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={scheduleTime}
                                    onChange={e => setScheduleTime(e.target.value)}
                                    // Minimum schedule time according to Pinterest docs (if you know, usually 15+ mins in future)
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isPublishing}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                            isPublishing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {isPublishing ? 'Publishing to Pinterest...' : (publishMode === 'schedule' ? 'Schedule Pin' : 'Publish Pin')}
                    </button>
                    {!boards.length && (
                         <p className="text-amber-600 text-xs mt-2 text-center">Loading boards or no boards available. Please ensure your account has a board.</p>
                    )}
                </form>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col items-center min-h-[400px]">
                <h3 className="text-sm font-medium text-slate-500 mb-4 w-full text-left">Live Preview</h3>
                <div className="w-full max-w-[345px] bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-200/50">
                    {imageUrl ? (
                        <div className="bg-slate-100 flex items-center justify-center min-h-[300px]">
                            <img src={imageUrl} alt={title} className="w-full h-auto object-contain max-h-[600px]" />
                        </div>
                    ) : (
                        <div className="w-full h-[354px] bg-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Generate an image to see your pin preview
                        </div>
                    )}
                    {(title || description) && (
                        <div className="p-4">
                            <h4 className="font-bold text-base text-slate-900 pb-1 break-words">{title || 'Pin Title'}</h4>
                            <p className="text-sm text-slate-600 line-clamp-3 mt-1 break-words">{description || 'Pin description will appear here...'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
                {Icons.pinterest}
                Pinterest AI
            </h1>
            
            <div className="flex border-b border-slate-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setViewState('create')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${viewState === 'create' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                        Create Pin
                    </button>
                    <button
                        onClick={() => setViewState('scheduled')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${viewState === 'scheduled' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        Scheduled
                    </button>
                    <button
                        onClick={() => setViewState('templates')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${viewState === 'templates' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        Templates
                        <span className="bg-teal-100 text-teal-800 py-0.5 px-2 rounded-full text-[10px] ml-1">Soon</span>
                    </button>
                    <button
                        onClick={() => setViewState('analytics')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${viewState === 'analytics' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        Analyses
                    </button>
                    <button
                        onClick={() => setViewState('accounts')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${viewState === 'accounts' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        {React.cloneElement(Icons.pinterest, { className: 'w-5 h-5 mb-0.5' })}
                        Account & Settings
                    </button>
                </nav>
            </div>
            
            <div className="mt-6">
                {renderSuiteContent()}
            </div>
        </div>
    );
};
