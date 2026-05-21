import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';

export const PublicLayout: React.FC<any> = (props) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header 
        currentUser={props.currentUser} 
        logout={props.handleLogout} 
        notifications={props.notifications || []}
        setNotifications={props.setNotifications || (() => {})}
        appName={props.adminSettings?.branding?.appName || 'App'}
        logoUrl={props.adminSettings?.branding?.logoUrl || null}
      />
      <Outlet />
    </div>
  );
};
