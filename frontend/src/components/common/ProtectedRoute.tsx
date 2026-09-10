import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Verifying security session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl max-w-lg mx-auto mt-20">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-100">Access Restricted</h2>
        <p className="text-xs text-slate-400 mt-2">
          Your role ({user.role}) does not have permission to view this administrative resource.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
