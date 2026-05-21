

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { User, Notification } from '../types';
import { Icons } from '../constants';
import { NotificationPanel } from './NotificationPanel';

interface HeaderProps {
  currentUser: User | null;
  logout: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  appName: string;
  logoUrl: string | null;
}

const NavButton: React.FC<{
  label: string;
  icon: React.ReactElement<{ className?: string }>;
  isActive: boolean;
  to: string;
}> = ({ label, icon, isActive, to }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-teal-50 text-teal-600 font-semibold'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
    }`}
  >
    {React.cloneElement(icon, { className: "h-5 w-5" })}
    <span className="hidden sm:inline">{label}</span>
  </Link>
);

const UserMenu: React.FC<{ user: User; logout: () => void }> = ({ user, logout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors">
        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-600">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-40 animate-fadeInUp">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
            </div>
            {user.plan === 'free' && (
              <Link to="/pricing" onClick={() => setIsOpen(false)} className="text-slate-700 block px-4 py-2 text-sm hover:bg-slate-100" role="menuitem">Upgrade to Pro</Link>
            )}
            <Link to="/api-docs" onClick={() => setIsOpen(false)} className="text-slate-700 block px-4 py-2 text-sm hover:bg-slate-100" role="menuitem">API Docs</Link>
            {(user.role === 'admin' || user.role === 'owner') && (
              <Link to="/admin" onClick={() => setIsOpen(false)} className="text-slate-700 block px-4 py-2 text-sm hover:bg-slate-100" role="menuitem">Admin Panel</Link>
            )}
            <button onClick={(e) => { e.preventDefault(); logout(); }} className="w-full text-left text-red-600 block px-4 py-2 text-sm hover:bg-slate-100" role="menuitem">Log Out</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ currentUser, logout, notifications, setNotifications, appName, logoUrl }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const hasUnread = notifications.some(n => !n.read);
  const location = useLocation();

  const handleNotificationClick = () => {
    setShowNotifications(prev => !prev);
    if (!showNotifications) {
      // Mark all as read when opening
      setNotifications(notifications.map(n => ({...n, read: true})));
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={currentUser ? "/dashboard" : "/"} className="flex items-center gap-3 focus:outline-none">
            {logoUrl ? (
                <img src={logoUrl} alt={`${appName} logo`} className="h-9 w-auto object-contain" />
            ) : (
                <div className="flex items-center justify-center h-9 w-9 bg-teal-600 rounded-lg flex-shrink-0">
                    <span className="font-bold text-white text-xl">{appName?.charAt(0) || 'R'}</span>
                </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {appName}
            </h1>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {currentUser ? (
              <>
                <NavButton label="Generator" to="/dashboard" icon={Icons.book} isActive={location.pathname === '/dashboard'} />
                <NavButton label="Tools" to="/tools" icon={Icons.sparkles} isActive={location.pathname === '/tools'} />
                <NavButton label="Pinterest" to="/pinterest" icon={Icons.pinterest} isActive={location.pathname === '/pinterest'} />
                <NavButton label="Research" to="/research" icon={Icons.trendingUp} isActive={location.pathname === '/research'} />
                <NavButton label="History" to="/history" icon={Icons.history} isActive={location.pathname === '/history'} />
                <NavButton label="Settings" to="/settings" icon={Icons.cog} isActive={location.pathname === '/settings'} />
                <div className="relative">
                  <button onClick={handleNotificationClick} className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 relative">
                      {Icons.bell}
                      {hasUnread && <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>}
                  </button>
                  {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} />}
                </div>
                <UserMenu user={currentUser} logout={logout} />
              </>
            ) : (
              <>
                <Link to="/api-docs" className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors hidden sm:inline-block">API Docs</Link>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">Log In</Link>
                <Link to="/signup" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">Sign Up</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
