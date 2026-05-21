
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateImage, handleGeneration, safeGenerate } from '../services/geminiService';
import { getPosts, getPostContent, importRecipe } from '../services/wordpressService';
import { Spinner } from '../components/Spinner';
import { RecipeEditor } from '../components/RecipeEditor';
import { CreatePost } from './CreatePost';
import { UpdatePost } from './UpdatePost';
import { EBookCreator } from './EBookCreator';
import { CreateCategory } from './CreateCategory';
import { BulkCategoryUpdater } from './BulkCategoryUpdater';
import { Icons } from '../constants';
import type { GeneratedPost, WordPressSite, PostHistoryItem, ToastType, View, ToastMessage, SettingsTab, WordPressPost, PublishStatus, ArticleAgentSettings, ImageConfiguration, AdminSettings, RecipeData } from '../types';

interface DashboardProps {
  sites: WordPressSite[];
  addItemsToQueue: (items: PostHistoryItem[]) => void;
  updatePostInHistory: (postId: string, updates: Partial<PostHistoryItem>) => void;
  showToast: (config: string | ToastMessage, type?: ToastType) => void;
  geminiApiKey: string;
  articleAgentSettings: ArticleAgentSettings;
  adminSettings: AdminSettings;
  refreshPostsTrigger: number;
  setRefreshPostsTrigger: React.Dispatch<React.SetStateAction<number>>;
  initialView?: 'selection' | 'tools' | 'create' | 'update' | 'ebook';
}

const EditorModal: React.FC<{ 
    post: GeneratedPost; 
    targetPost: WordPressPost | null; 
    onSave: (postToSave: GeneratedPost, maybeTargetPost: WordPressPost | null, status: 'publish' | 'draft') => void; 
    onClose: () => void; 
    isSaving: boolean; 
    onRegenerateImage: () => Promise<void>;
    isRegeneratingImage: boolean;
}> = ({ post, targetPost, onSave, onClose, isSaving, onRegenerateImage, isRegeneratingImage }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-0 sm:p-4">
        <div className="bg-slate-100 rounded-none sm:rounded-lg shadow-xl w-full h-full max-w-5xl sm:h-[95vh] flex flex-col">
            <div className="p-4 border-b bg-white sm:rounded-t-lg flex justify-between items-center"><h2 className="text-lg font-bold text-slate-900 truncate pr-2"><span className="hidden sm:inline">Editing Recipe for: </span><span className="font-normal">{targetPost?.title || "New Recipe"}</span></h2><button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="flex-grow overflow-y-auto"><RecipeEditor post={post} targetPost={targetPost} onSave={onSave} onCancel={onClose} isSaving={isSaving} onRegenerateImage={onRegenerateImage} isRegeneratingImage={isRegeneratingImage} /></div>
        </div>
    </div>
);

const SelectionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, description, icon, onClick }) => (
    <button
        onClick={onClick}
        className="group w-full text-center p-8 border border-slate-200/80 rounded-xl hover:border-teal-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300 ease-in-out transform hover:-translate-y-2 hover:shadow-xl"
    >
        <div className="flex flex-col items-center gap-4">
            <div className="flex-shrink-0 text-teal-600 bg-teal-100 rounded-full p-4 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-xl">{title}</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">{description}</p>
            </div>
        </div>
    </button>
);

const NEW_POST_GENERATING_ID = 0;

export const Dashboard: React.FC<DashboardProps> = ({ sites, addItemsToQueue, updatePostInHistory, showToast, geminiApiKey, articleAgentSettings, adminSettings, refreshPostsTrigger, setRefreshPostsTrigger, initialView }) => {
  const navigate = useNavigate();
  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || '');
  const [editorData, setEditorData] = useState<{ post: GeneratedPost, targetPost: WordPressPost | null, generationType: 'full' | 'intro' | 'seo-article', historyId?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [viewState, setViewState] = useState<'selection' | 'tools' | 'create' | 'update' | 'ebook' | 'create_category' | 'bulk_category'>(initialView || 'selection');
  const [wpPosts, setWpPosts] = useState<WordPressPost[]>([]);
  const [isFetchingPosts, setIsFetchingPosts] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);

  useEffect(() => {
    if (initialView) {
      setViewState(initialView);
    } else {
      setViewState('selection');
    }
  }, [initialView]);

  useEffect(() => {
    const selectedSiteExists = sites.some(s => s.id === selectedSiteId);
    if (sites.length > 0 && (!selectedSiteId || !selectedSiteExists)) {
      setSelectedSiteId(sites[0].id);
    } 
    else if (sites.length === 0 && selectedSiteId !== '') {
      setSelectedSiteId('');
    }
  }, [sites, selectedSiteId]);

  useEffect(() => {
    const fetchPostsAndCategories = async () => {
        if (!selectedSiteId) { 
          setWpPosts([]); 
          setCategories([]);
          return; 
        }
        const site = sites.find(s => s.id === selectedSiteId);
        if (!site) return;
        setIsFetchingPosts(true);
        setIsFetchingCategories(true);
        try {
            const fetchedPosts = await getPosts(site);
            setWpPosts(fetchedPosts);
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'Failed to fetch posts', type: 'error', persistent: true });
            setWpPosts([]);
        } finally {
            setIsFetchingPosts(false);
        }
        
        try {
            const fetchedCategories = await import('../services/wordpressService').then(m => m.getCategories(site));
            setCategories(fetchedCategories);
        } catch (error) {
            setCategories([]);
        } finally {
            setIsFetchingCategories(false);
        }
    };
    if (selectedSiteId) {
        fetchPostsAndCategories();
    } else {
        setIsFetchingPosts(false);
        setIsFetchingCategories(false);
    }
  }, [selectedSiteId, sites, showToast, refreshPostsTrigger]);
  
  const existingPostsForLinking = useMemo(() => wpPosts.map(p => ({ title: p.title, link: p.link })), [wpPosts]);

  const checkApiKey = () => {
    if (!geminiApiKey) {
      showToast({ message: 'Please set your Gemini API Key first.', type: 'error', persistent: true, action: { label: 'Go to Settings', onClick: () => navigate('/settings') } });
      return false;
    }
    return true;
  }
  
  const handleSaveToPost = (postToSave: GeneratedPost, maybeTargetPost: WordPressPost | null, status: 'publish' | 'draft') => {
    if (!postToSave.post_title?.trim() || !postToSave.recipe_data.name?.trim() || postToSave.recipe_data.ingredients.length === 0 || postToSave.recipe_data.instructions.length === 0) {
        showToast({ message: "Title, Recipe Name, Ingredients, and Instructions are required.", type: 'error' }); return;
    }
    const site = sites.find(s => s.id === selectedSiteId);
    if (!site) { showToast({ message: "Selected site not found!", type: 'error' }); return; }
    
    const isNewPost = !maybeTargetPost;
    const historyId = editorData?.historyId || crypto.randomUUID();
    const targetPostId = maybeTargetPost?.id ? Number(maybeTargetPost.id) : 0;
    const targetPostTitle = isNewPost ? postToSave.post_title : (maybeTargetPost?.title || 'Unknown Post');

    const item: PostHistoryItem = {
      ...postToSave,
      id: historyId,
      siteId: site.id,
      siteName: site.name,
      targetPostId: targetPostId,
      targetPostTitle: targetPostTitle,
      status: 'queued',
      publishedAt: new Date().toISOString(),
      intendedStatus: status,
      generationType: editorData?.generationType || 'full',
    };
    
    // For new posts, we were in the editor, so we need to update the existing history item.
    if(isNewPost && editorData?.historyId){
      updatePostInHistory(editorData.historyId, item);
    }
    addItemsToQueue([item]);
    
    showToast('Post added to queue. Check History for progress.', 'success');
    setEditorData(null);
    navigate('/history');
  };

  const handleRegenerate = (targetPost: WordPressPost, generationType: 'full' | 'intro' | 'seo-article', imageStrategy: 'keep' | 'regenerate' = 'regenerate') => {
    if (!checkApiKey()) return;
    const site = sites.find(s => s.id === selectedSiteId);
    if (!site) return;

    const placeholderRecipeData: RecipeData = { name: '...', description: '...', ingredients: [], instructions: [], keywords: [], prep_time: '', cook_time: '', total_time: '', yield: '', cuisine: '', category: '' };
    const queueItem: PostHistoryItem = {
        id: crypto.randomUUID(),
        siteId: site.id,
        siteName: site.name,
        targetPostId: targetPost.id,
        targetPostTitle: targetPost.title,
        status: 'queued', 
        publishedAt: new Date().toISOString(),
        post_title: `Queued: ${targetPost.title}`,
        post_content: 'Waiting in queue...',
        recipe_data: placeholderRecipeData,
        generationType,
        imageStrategy,
    };
    
    addItemsToQueue([queueItem]); 
    showToast(`'${targetPost.title}' added to the generation queue.`, 'success');
    navigate('/history');
  };
  
  const handleNewPostGeneration = async (generationType: 'full' | 'intro' | 'seo-article', generationTab: 'keyword' | 'text', primaryKeyword: string, recipeText: string, imageConfig: ImageConfiguration, generatePinterestPin?: boolean) => {
    if (!checkApiKey()) return;

    const site = sites.find(s => s.id === selectedSiteId);
    if(!site){
        showToast('Selected site not found!', 'error');
        return;
    }
    
    const historyId = crypto.randomUUID();
    const placeholderRecipeData: RecipeData = { name: 'AI is creating a recipe...', description: '...', ingredients: [], instructions: [], keywords: [], prep_time: '', cook_time: '', total_time: '', yield: '', cuisine: '', category: '' };
    const initialTitle = `Generating: ${generationTab === 'keyword' && primaryKeyword ? primaryKeyword : 'from text'}`;

    const queueItem: PostHistoryItem = {
        id: historyId,
        siteId: selectedSiteId,
        siteName: site.name,
        targetPostId: NEW_POST_GENERATING_ID,
        targetPostTitle: initialTitle,
        status: 'queued',
        publishedAt: new Date().toISOString(),
        post_title: initialTitle,
        post_content: 'AI is generating new content...',
        recipe_data: placeholderRecipeData,
        sourceData: { generationType, generationTab, primaryKeyword, recipeText, imageConfig, generatePinterestPin },
    };

    addItemsToQueue([queueItem]);
    showToast('New post generation added to queue. Check History for progress.', 'success');
    navigate('/history');
  };

  const handleRegenerateImage = async () => {
    if (!checkApiKey() || !editorData) return;
    setIsRegeneratingImage(true);
    try {
        const recipeName = editorData.post.recipe_data.name;
        const cuisine = editorData.post.recipe_data.cuisine;
        if (!recipeName) {
            showToast({ message: 'Recipe name is missing, cannot generate image.', type: 'error' });
            return;
        }
        const imagePrompt = `Photorealistic food photography of ${recipeName}, ${cuisine || ''} style, beautifully plated, bright lighting, high detail, delicious looking.`;
        const newImageBase64 = await safeGenerate(generateImage(geminiApiKey, imagePrompt));
        setEditorData(prev => {
            if (!prev) return null;
            const newPost = { ...prev.post, recipe_data: { ...prev.post.recipe_data, image: newImageBase64 }};
            return { ...prev, post: newPost };
        });
        showToast('New image generated!', 'success');
    } catch (err) {
        showToast({ message: err instanceof Error ? err.message : 'Failed to regenerate image', type: 'error', persistent: true });
    } finally {
        setIsRegeneratingImage(false);
    }
  };
  
  const renderCurrentView = () => {
    const commonProps = { sites, selectedSiteId, showToast };
    switch (viewState) {
        case 'create':
            return <div className="animate-fadeInUp"><CreatePost {...commonProps} isGenerating={false} handleGenerate={handleNewPostGeneration} setSelectedSiteId={setSelectedSiteId} /></div>;
        case 'update':
            return <div className="animate-fadeInUp"><UpdatePost {...commonProps} wpPosts={wpPosts} setSelectedSiteId={setSelectedSiteId} addItemsToQueue={addItemsToQueue} handleRegenerate={handleRegenerate} refreshPostsTrigger={refreshPostsTrigger} isFetchingPosts={isFetchingPosts} /></div>;
        case 'ebook':
            return <div className="animate-fadeInUp"><EBookCreator sites={sites} selectedSiteId={selectedSiteId} wpPosts={wpPosts} isDataLoading={isFetchingPosts} geminiApiKey={geminiApiKey} showToast={showToast} checkApiKey={checkApiKey} onBack={() => setViewState('tools')} /></div>;
        case 'create_category':
            return <div className="animate-fadeInUp"><CreateCategory sites={sites} selectedSiteId={selectedSiteId} categories={categories} isFetchingCategories={isFetchingCategories} showToast={showToast} onCategoryCreated={() => setRefreshPostsTrigger(p => p + 1)} geminiApiKey={geminiApiKey} checkApiKey={checkApiKey} onBack={() => setViewState('tools')} /></div>;
        case 'bulk_category':
            return <div className="animate-fadeInUp"><BulkCategoryUpdater sites={sites} selectedSiteId={selectedSiteId} wpPosts={wpPosts} categories={categories} isDataLoading={isFetchingPosts || isFetchingCategories} showToast={showToast} onBack={() => setViewState('tools')} /></div>;
        case 'tools':
            return (
                 <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200/80 animate-fadeInUp max-w-4xl mx-auto">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tools</h2>
                        <p className="text-slate-500 mt-3 max-w-lg mx-auto">Extra tools to expand your content empire.</p>
                    </div>
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <SelectionCard 
                            title="Create an e-book"
                            description="Turn your existing recipes into a beautifully formatted PDF eBook automatically."
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                            onClick={() => setViewState('ebook')}
                        />
                        <SelectionCard 
                            title="Create New Category"
                            description="AI-generated category with SEO slug and description."
                            icon={Icons.magic}
                            onClick={() => setViewState('create_category')}
                        />
                        <SelectionCard 
                            title="Bulk Category Updater"
                            description="Upload a CSV to quickly update categories for lots of existing posts."
                            icon={Icons.upload}
                            onClick={() => setViewState('bulk_category')}
                        />
                    </div>
                 </div>
            );
        case 'selection':
        default:
            return (
                 <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200/80 animate-fadeInUp max-w-4xl mx-auto">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Let's Get Cooking!</h2>
                        <p className="text-slate-500 mt-3 max-w-lg mx-auto">What are we creating today? Choose an option below to start crafting your next delicious recipe post.</p>
                    </div>
                    <div className="mt-10 flex flex-col md:flex-row gap-6 max-w-2xl mx-auto">
                        <SelectionCard 
                            title="Create New Post"
                            description="Generate a brand new, SEO-optimized recipe post from scratch using a keyword or your own text."
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                            onClick={() => setViewState('create')}
                        />
                         <SelectionCard 
                            title="Update Existing Post"
                            description="Add a recipe card to one of your existing blog posts or regenerate content for a post that already has one."
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                            onClick={() => setViewState('update')}
                        />
                    </div>
                 </div>
            );
    }
  };

  return (
    <div>
        {(viewState === 'create' || viewState === 'update') && (
             <button onClick={() => setViewState('selection')} className="mb-4 text-sm font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Back to Generator Options
            </button>
        )}
        {(viewState === 'ebook' || viewState === 'create_category' || viewState === 'bulk_category') && (
             <button onClick={() => setViewState('tools')} className="mb-4 text-sm font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Back to Tools Options
            </button>
        )}
        {renderCurrentView()}
        {editorData && <EditorModal post={editorData.post} targetPost={editorData.targetPost} onSave={handleSaveToPost} onClose={() => setEditorData(null)} isSaving={isSaving} onRegenerateImage={handleRegenerateImage} isRegeneratingImage={isRegeneratingImage} />}
    </div>
  );
};
