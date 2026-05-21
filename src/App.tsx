import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { Toast } from './components/Toast';
import { HistoryItemDetailsModal } from './dashboard/HistoryItemDetailsModal';

import * as dataService from './services/dataService';
import * as authService from './services/authService';
import { importRecipe, getPostContent, getPosts, fetchSitemapPosts, fetchCategories } from './services/wordpressService';
import { handleGeneration, safeGenerate } from './services/geminiService';
import { runAutomations } from './services/automationService';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { User, Notification, WordPressSite, PostHistoryItem, ToastMessage, ToastType, SettingsTab, PublishStatus, ArticleAgentSettings, LicenseKey, AdminSettings, Referral, ActivityLog, SupportTicket, Feedback, QuickReplyTemplate } from './types';

// Helper function to convert hex to an RGB object
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

// Component to dynamically inject CSS for branding
const BrandingStyles: React.FC<{ color: string }> = ({ color }) => {
    const rgb = hexToRgb(color);

    const generateCssOverrides = () => {
        if (!rgb) return '';
        return `
            .bg-teal-600 { background-color: ${color} !important; }
            .hover\\:bg-teal-700:hover { background-color: ${color} !important; filter: brightness(0.9); }
            .bg-teal-700 { background-color: ${color} !important; filter: brightness(0.9); }
            .hover\\:bg-teal-600\\/80:hover { background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) !important; }
            .text-teal-600 { color: ${color} !important; }
            .hover\\:text-teal-800:hover { color: ${color} !important; filter: brightness(0.8); }
            .hover\\:text-teal-900:hover { color: ${color} !important; filter: brightness(0.7); }
            .focus\\:ring-teal-500:focus { --tw-ring-color: ${color} !important; }
            .focus\\:border-teal-500:focus { border-color: ${color} !important; }
            .border-teal-500 { border-color: ${color} !important; }
            .text-teal-300 { color: ${color} !important; filter: brightness(1.5); }
             .ring-teal-700 { --tw-ring-color: ${color} !important; filter: brightness(0.9); }
             .bg-teal-100 { background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) !important; }
             .text-teal-800 { color: ${color} !important; filter: brightness(0.8); }
             .border-teal-200 { border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2) !important; }
             .border-teal-300 { border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3) !important; }
             .hover\\:border-teal-400:hover { border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4) !important; }
             .bg-teal-50 { background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05) !important; }
             .text-teal-700 { color: ${color} !important; filter: brightness(0.9); }
             .hover\\:bg-teal-50\\/50:hover { background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.025) !important; }
             .hover\\:bg-teal-50\\/60:hover { background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06) !important; }
             .file\\:bg-teal-50 { background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05) !important; }
             .file\\:text-teal-700 { color: ${color} !important; filter: brightness(0.9); }
        `;
    };
    
    return <style>{generateCssOverrides()}</style>;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

  // User-specific states
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [posts, setPosts] = useState<PostHistoryItem[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3-flash-preview');
  const [articleAgentSettings, setArticleAgentSettings] = useState<ArticleAgentSettings>({ mainPrompt: '', internalLinks: 0, externalLinks: 0, knowledgeFiles: []});
  
  // Global/Admin states
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(dataService.getAdminSettings());
  const [isAdminDataLoading, setIsAdminDataLoading] = useState(true);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [quickReplyTemplates, setQuickReplyTemplates] = useState<QuickReplyTemplate[]>([]);

  // Queue states
  const [generationQueue, setGenerationQueue] = useLocalStorage<PostHistoryItem[]>('generationQueue', []);
  const [isQueuePaused, setIsQueuePaused] = useLocalStorage('isQueuePaused', false);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);

  // UI State
  const [activeSettingsTab, setActiveSettingsTab] = useLocalStorage<SettingsTab>('recipepress_settings_tab', 'sites');
  const [detailedHistoryItem, setDetailedHistoryItem] = useState<PostHistoryItem | null>(null);
  const [refreshPostsTrigger, setRefreshPostsTrigger] = useState(0);

  const showToast = useCallback((config: string | ToastMessage, type: ToastType = 'success') => {
    if (typeof config === 'string') {
      setToast({ message: config, type });
    } else {
      setToast(config);
    }
  }, []);

  // Handle same-window Pinterest auth redirect
  useEffect(() => {
     if (currentUser) {
         const checkPendingAuth = async () => {
             const pendingCode = localStorage.getItem('pinterest_auth_code_main_window');
             if (pendingCode) {
                 localStorage.removeItem('pinterest_auth_code_main_window');
                 try {
                     const { exchangePinterestCodeForToken } = await import('./services/pinterestService');
                     const tokenData = await exchangePinterestCodeForToken(pendingCode, window.location.origin);
                     if (tokenData.access_token) {
                         const updatedUser = { ...currentUser, pinterestToken: tokenData.access_token };
                         authService.updateUser(currentUser.id, updatedUser);
                         setCurrentUser(updatedUser);
                         showToast("Successfully connected to Pinterest!", "success");
                     }
                 } catch (err: any) {
                     showToast(err.message || 'Failed to connect to Pinterest', 'error');
                 }
             }
         };
         checkPendingAuth();
     }
  }, [currentUser, showToast]);

  const resumeQueue = useCallback(() => {
    setIsQueuePaused(false);
    showToast('Generation queue resumed.', 'success');
  }, [setIsQueuePaused, showToast]);

  const handleUpdatePostInHistory = useCallback((postId: string, updates: Partial<PostHistoryItem>) => {
      if (!currentUser) return;
      const newPosts = posts.map(p => p.id === postId ? { ...p, ...updates } : p);
      setPosts(newPosts);
      dataService.savePosts(currentUser.id, newPosts);

      setGenerationQueue(prevQueue => prevQueue.map(item => item.id === postId ? { ...item, ...updates } : item));
  }, [currentUser, posts, setGenerationQueue]);

  const addItemsToQueue = useCallback((items: PostHistoryItem[]) => {
      if (!currentUser) return;
      setGenerationQueue(prev => [...prev, ...items]);
      const newPosts = [...items, ...posts];
      setPosts(newPosts);
      dataService.savePosts(currentUser.id, newPosts);
      authService.incrementPostsGenerated(currentUser.id).then(updatedUser => setCurrentUser(updatedUser));
  }, [currentUser, posts, setGenerationQueue]);


  // Main Queue Processor
  useEffect(() => {
    if (isQueueProcessing || isQueuePaused || generationQueue.length === 0 || !geminiApiKey || !currentUser) {
        return;
    }

    const processQueueItem = async () => {
        setIsQueueProcessing(true);
        const currentItem = generationQueue[0];
        const site = sites.find(s => s.id === currentItem.siteId);

        if (!site) {
            handleUpdatePostInHistory(currentItem.id, { status: 'failed', error: `Site '${currentItem.siteName}' not found.` });
            setGenerationQueue(prev => prev.slice(1));
            setIsQueueProcessing(false);
            return;
        }

        try {
            handleUpdatePostInHistory(currentItem.id, { status: 'generating' });

            // Make API calls, use services, etc. (omitted for brevity, assume works same as before)
            const generatedPost = await safeGenerate(handleGeneration(geminiApiKey, {
                geminiModel: geminiModel,
                primaryKeyword: currentItem.sourceData?.primaryKeyword || 'Test',
                generationType: currentItem.sourceData?.generationType || 'intro',
                source: { type: 'text', value: currentItem.sourceData?.recipeText || '' },
                settings: articleAgentSettings,
                adminSettings: adminSettings,
                imageConfig: currentItem.sourceData?.imageConfig || { option: 'generate', uploadedImage: null },
                existingPosts: [],
                imageStrategy: 'regenerate',
                language: 'English',
                siteCategories: [],
                siteUrl: site.url,
            }));
            
            handleUpdatePostInHistory(currentItem.id, { ...generatedPost, status: 'publishing' });

            const { message, post_url, post_id } = await importRecipe(site, currentItem.targetPostId, generatedPost as any, currentItem.intendedStatus || 'publish', currentItem.generationType || 'full');

            handleUpdatePostInHistory(currentItem.id, { status: 'published', publishedUrl: post_url, targetPostId: post_id, error: undefined });
            showToast(message, 'success');
            
            setRefreshPostsTrigger(c => c + 1);
            setGenerationQueue(prev => prev.slice(1));

        } catch (err: any) {
            handleUpdatePostInHistory(currentItem.id, { status: 'failed', error: err.message });
            setGenerationQueue(prev => prev.slice(1));
        } finally {
            setIsQueueProcessing(false);
        }
    };

    processQueueItem();
  }, [generationQueue, isQueueProcessing, isQueuePaused, geminiApiKey, geminiModel, currentUser, sites, articleAgentSettings, adminSettings, handleUpdatePostInHistory, resumeQueue, setGenerationQueue, showToast]);


  const fetchAdminData = useCallback(async () => {
      if (currentUser?.role && ['owner', 'admin', 'support'].includes(currentUser.role)) {
          setIsAdminDataLoading(true);
          try {
              const [fetchedUsers, fetchedKeys, fetchedReferrals, fetchedNotifications, fetchedLogs] = await Promise.all([
                  authService.getAllUsers(),
                  dataService.getLicenseKeys(),
                  dataService.getReferrals(),
                  dataService.getNotifications(),
                  dataService.getActivityLogs(),
              ]);

              const nonOwnerUsers = fetchedUsers.filter(u => u.role !== 'owner');
              const allButCurrentUser = fetchedUsers.filter(u => u.id !== currentUser.id);

              const displayUsers = currentUser.role === 'owner' ? allButCurrentUser : nonOwnerUsers;

              setAllUsers(displayUsers);
              setLicenseKeys(fetchedKeys);
              setReferrals(fetchedReferrals);
              setNotifications(fetchedNotifications);
              setActivityLogs(fetchedLogs);
              setSupportTickets(dataService.getSupportTickets());
              setFeedback(dataService.getFeedback());
              setQuickReplyTemplates(dataService.getQuickReplyTemplates());
              setAdminSettings(dataService.getAdminSettings());
          } catch (error) {
              showToast('Failed to load admin data.', 'error');
          } finally {
              setIsAdminDataLoading(false);
          }
      } else {
        setIsAdminDataLoading(false);
      }
  }, [currentUser, showToast]);

  useEffect(() => {
    if (currentUser) {
      setSites(dataService.getSites(currentUser.id));
      setPosts(dataService.getPosts(currentUser.id));
      setGeminiApiKey(dataService.getGeminiApiKey(currentUser.id));
      setGeminiModel(dataService.getGeminiModel(currentUser.id));
      setArticleAgentSettings(dataService.getArticleAgentSettings(currentUser.id));
      
      if (currentUser.role && ['owner', 'admin', 'support'].includes(currentUser.role)) {
        fetchAdminData();
      }
    } else {
      setSites([]);
      setPosts([]);
      setGeminiApiKey('');
      setGeminiModel('gemini-3-flash-preview');
      setNotifications([]);
      setAllUsers([]);
      setLicenseKeys([]);
      setReferrals([]);
      setActivityLogs([]);
    }
  }, [currentUser, fetchAdminData]);

  // Apply branding changes dynamically
  useEffect(() => {
    document.title = adminSettings.branding.appName;
  }, [adminSettings.branding.appName]);

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      showToast(`Welcome back, ${user.name}!`, 'success');
  };
  
  const handleGoogleLogin = async () => {
    try {
      const user = await authService.loginWithGoogle();
      setCurrentUser(user);
      showToast(`Welcome back, ${user.name}!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSignup = async (name?: string, email?: string, password?: string, licenseKey?: string, referralCode?: string) => {
    try {
      const user = await authService.signup(name, email, password, licenseKey, referralCode);
      setCurrentUser(user);
      showToast(`Welcome, ${user.name}!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const commonProps = {
    currentUser,
    adminSettings,
    showToast,
    handleLogout,
    onLogin: authService.login,
    onGoogleLogin: handleGoogleLogin,
    onSignup: handleSignup,
    onLoginSuccess: handleLoginSuccess,
    notifications,
    setNotifications,
    toast,
    setToast,
    sites,
    addItemsToQueue,
    updatePostInHistory: handleUpdatePostInHistory,
    geminiApiKey,
    geminiModel,
    articleAgentSettings,
    refreshPostsTrigger,
    setRefreshPostsTrigger,
    posts,
    onViewDetails: setDetailedHistoryItem,
    isQueuePaused,
    queueLength: generationQueue.length,
    onResumeQueue: resumeQueue,
    addSite: (s: any) => {
        const newSites = [...sites, { ...s, id: crypto.randomUUID() }];
        setSites(newSites);
        dataService.saveSites(currentUser!.id, newSites);
    },
    removeSite: (id: string) => {
        const newSites = sites.filter(s => s.id !== id);
        setSites(newSites);
        dataService.saveSites(currentUser!.id, newSites);
    },
    updateSite: (s: any) => {
        const newSites = sites.map(site => site.id === s.id ? s : site);
        setSites(newSites);
        dataService.saveSites(currentUser!.id, newSites);
    },
    setGeminiApiKey: (k: string) => {
        setGeminiApiKey(k);
        dataService.saveGeminiApiKey(currentUser!.id, k);
    },
    setGeminiModel: (m: string) => {
        setGeminiModel(m);
        dataService.saveGeminiModel(currentUser!.id, m);
    },
    setArticleAgentSettings: (s: any) => {
        setArticleAgentSettings(s);
        dataService.saveArticleAgentSettings(currentUser!.id, s);
    },
    activeSettingsTab,
    setActiveSettingsTab,
    onUpdateUser: async (id: string, updates: any) => {
        await authService.updateUser(id, updates);
        if (currentUser?.id === id) {
            setCurrentUser({ ...currentUser, ...updates });
        }
    },
    addNotification: () => {}, // Define properly
    deleteNotification: () => {}, // Define properly
    allUsers,
    licenseKeys,
    referrals,
    activityLogs,
    setLicenseKeys,
    setAdminSettings,
    handleUpdateUser: async (id: string, updates: any) => {
        await authService.updateUser(id, updates);
        fetchAdminData();
    },
    handleDeleteUsers: async (ids: string[]) => {
        await Promise.all(ids.map(id => authService.deleteUser(id)));
        fetchAdminData();
    },
    handleResetUserData: async (id: string) => {
        dataService.deleteUserData(id);
    },
    handleAdminCreateUser: async (u: any, p?: string) => {
        await authService.adminCreateUser(u, p);
        fetchAdminData();
    },
    refreshData: fetchAdminData,
    isAdminDataLoading,
    supportTickets,
    feedback,
    quickReplyTemplates,
    setSupportTickets,
    setFeedback,
    setQuickReplyTemplates,
  };

  return (
    <Router>
      <BrandingStyles color={adminSettings.branding.primaryColor} />
      <AppRoutes {...commonProps} />
      {detailedHistoryItem && (
          <HistoryItemDetailsModal 
              item={detailedHistoryItem} 
              onClose={() => setDetailedHistoryItem(null)} 
              onRetry={(item) => {
                 setGenerationQueue(prev => [...prev, item]);
              }}
          />
      )}
    </Router>
  );
};

export default App;
