import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import * as authService from '../services/authService';

export const AdminRoute: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (!['owner', 'admin', 'support'].includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
