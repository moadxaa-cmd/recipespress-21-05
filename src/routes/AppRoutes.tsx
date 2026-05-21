import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

// Views
import { LandingPage } from '../landing/LandingPage';
import { AuthPage } from '../auth/AuthPage';
import { PricingPage } from '../public/PricingPage';
import { AboutPage } from '../public/AboutPage';
import { PrivacyPolicyPage } from '../public/PrivacyPolicyPage';
import { TermsPage } from '../public/TermsPage';
import { ApiDocsPage } from '../public/ApiDocsPage';
import { Dashboard } from '../dashboard/Dashboard';
import { AdminDashboard } from '../admin/AdminDashboard';
import { PostHistory } from '../dashboard/PostHistory';
import { Settings } from '../dashboard/Settings';
import { CreatePin } from '../dashboard/CreatePin';
import { PinterestResearch } from '../components/PinterestResearch';

export const AppRoutes: React.FC<any> = (props) => { console.log('Current pathname:', window.location.pathname);
  return (
    <Routes>
      <Route element={<PublicLayout {...props} />}>
        <Route path="/" element={<LandingPage appName={props.adminSettings?.branding?.appName || 'RecipePress'} />} />
        <Route path="/login" element={props.currentUser ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" onLogin={props.onLogin} onGoogleLogin={props.onGoogleLogin} onSignup={props.onSignup} onLoginSuccess={props.onLoginSuccess} />} />
        <Route path="/signup" element={props.currentUser ? <Navigate to="/dashboard" replace /> : <AuthPage mode="signup" onLogin={props.onLogin} onGoogleLogin={props.onGoogleLogin} onSignup={props.onSignup} onLoginSuccess={props.onLoginSuccess} />} />
        <Route path="/pricing" element={<PricingPage currentUser={props.currentUser} />} />
        <Route path="/about" element={<AboutPage appName={props.adminSettings?.branding?.appName || 'RecipePress'} />} />
        <Route path="/privacy" element={<PrivacyPolicyPage appName={props.adminSettings?.branding?.appName || 'RecipePress'} />} />
        <Route path="/privacy/*" element={<PrivacyPolicyPage appName={props.adminSettings?.branding?.appName || 'RecipePress'} />} />
        <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
        <Route path="/terms" element={<TermsPage appName={props.adminSettings?.branding?.appName || 'RecipePress'} />} />
        <Route path="/terms/*" element={<TermsPage appName={props.adminSettings?.branding?.appName || 'RecipePress'} />} />
        <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
        <Route path="/api-docs" element={<ApiDocsPage appName={props.adminSettings?.branding?.appName || 'RecipePress'} />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout {...props} appName={props.adminSettings?.branding?.appName || 'RecipePress'} logoUrl={props.adminSettings?.branding?.logoUrl || null} />}>
          <Route path="/dashboard" element={
            <Dashboard 
               sites={props.sites} 
               addItemsToQueue={props.addItemsToQueue}
               updatePostInHistory={props.updatePostInHistory}
               showToast={props.showToast} 
               geminiApiKey={props.geminiApiKey} 
               articleAgentSettings={props.articleAgentSettings}
               adminSettings={props.adminSettings}
               refreshPostsTrigger={props.refreshPostsTrigger}
               setRefreshPostsTrigger={props.setRefreshPostsTrigger}
            />
          } />
          <Route path="/tools" element={
            <Dashboard 
               sites={props.sites} 
               addItemsToQueue={props.addItemsToQueue}
               updatePostInHistory={props.updatePostInHistory}
               showToast={props.showToast} 
               geminiApiKey={props.geminiApiKey} 
               articleAgentSettings={props.articleAgentSettings}
               adminSettings={props.adminSettings}
               refreshPostsTrigger={props.refreshPostsTrigger}
               setRefreshPostsTrigger={props.setRefreshPostsTrigger}
               initialView="tools"
            />
          } />
          <Route path="/history" element={
            <PostHistory 
               posts={props.posts} 
               onViewDetails={props.onViewDetails} 
               isQueuePaused={props.isQueuePaused}
               queueLength={props.queueLength}
               onResumeQueue={props.onResumeQueue}
            />
          } />
          <Route path="/settings" element={
            <Settings 
                sites={props.sites} 
                addSite={props.addSite} 
                removeSite={props.removeSite}
                updateSite={props.updateSite}
                showToast={props.showToast} 
                geminiApiKey={props.geminiApiKey}
                setGeminiApiKey={props.setGeminiApiKey}
                articleAgentSettings={props.articleAgentSettings}
                setArticleAgentSettings={props.setArticleAgentSettings}
                activeTab={props.activeSettingsTab}
                setActiveTab={props.setActiveSettingsTab}
                currentUser={props.currentUser}
                onUpdateUser={props.onUpdateUser}
                isQueuePaused={props.isQueuePaused}
            />
          } />
          <Route path="/pinterest" element={
            <CreatePin currentUser={props.currentUser} showToast={props.showToast} onUpdateUser={props.onUpdateUser} />
          } />
          <Route path="/research" element={
            <PinterestResearch />
          } />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout {...props} appName={props.adminSettings?.branding?.appName || 'RecipePress'} logoUrl={props.adminSettings?.branding?.logoUrl || null} />}>
          <Route path="/admin" element={
            <AdminDashboard 
                showToast={props.showToast} 
                addNotification={props.addNotification}
                deleteNotification={props.deleteNotification}
                allNotifications={props.notifications} 
                allUsers={props.allUsers}
                licenseKeys={props.licenseKeys}
                referrals={props.referrals}
                activityLogs={props.activityLogs}
                adminSettings={props.adminSettings}
                setLicenseKeys={props.setLicenseKeys}
                setAdminSettings={props.setAdminSettings}
                handleUpdateUser={props.handleUpdateUser}
                handleDeleteUsers={props.handleDeleteUsers}
                handleResetUserData={props.handleResetUserData}
                handleAdminCreateUser={props.handleAdminCreateUser}
                currentUser={props.currentUser}
                refreshData={props.refreshData}
                isLoading={props.isAdminDataLoading}
                supportTickets={props.supportTickets}
                feedback={props.feedback}
                quickReplyTemplates={props.quickReplyTemplates}
                setSupportTickets={props.setSupportTickets}
                setFeedback={props.setFeedback}
                setQuickReplyTemplates={props.setQuickReplyTemplates}
            />
          } />
        </Route>
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
