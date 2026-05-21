import React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import * as authService from '../services/authService';

interface AdminLayoutProps {
  notifications: any[];
  setNotifications: (n: any[]) => void;
  appName: string;
  logoUrl: string | null;
  toast: any;
  setToast: (t: any) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  notifications,
  setNotifications,
  appName,
  logoUrl,
  toast,
  setToast
}) => {
  const currentUser = authService.getCurrentUser();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    authService.logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Header 
        currentUser={currentUser} 
        logout={handleLogout} 
        notifications={notifications}
        setNotifications={setNotifications}
        appName={appName}
        logoUrl={logoUrl}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
};
