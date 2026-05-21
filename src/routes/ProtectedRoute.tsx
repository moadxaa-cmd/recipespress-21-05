import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import * as authService from '../services/authService';

export const ProtectedRoute: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
