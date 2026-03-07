import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * Route guard: requires any authenticated user (admin OR employee).
 * Redirects unauthenticated visitors to /login.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAdmin, employee, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <LoadingScreen />;

  if (!isAdmin && !employee) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Route guard: requires Super Admin.
 * Redirects non-admins to their appropriate dashboard.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, employee, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <LoadingScreen />;

  if (!isAdmin) {
    if (employee) {
      const elevatedRoles = ['manager', 'accountant', 'owner'];
      if (elevatedRoles.includes(employee.role || '')) {
        return <Navigate to="/manager" replace />;
      }
      return <Navigate to="/employee" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Route guard: requires Manager / Accountant / Owner role.
 * Redirects others to their appropriate dashboard.
 */
export function RequireManager({ children }: { children: React.ReactNode }) {
  const { isAdmin, employee, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <LoadingScreen />;

  if (!employee) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const elevatedRoles = ['manager', 'accountant', 'owner'];
  if (!elevatedRoles.includes(employee.role || '')) {
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
}

/**
 * Route guard: requires Employee (any role — employee, manager, accountant, owner).
 * Redirects admins to /admin.
 */
export function RequireEmployee({ children }: { children: React.ReactNode }) {
  const { isAdmin, employee, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <LoadingScreen />;

  if (!employee) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Guard for the login page: if already authenticated, redirect to the right dashboard.
 */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { isAdmin, employee, isInitializing } = useAuth();

  if (isInitializing) return <LoadingScreen />;

  if (isAdmin) return <Navigate to="/admin" replace />;

  if (employee) {
    const elevatedRoles = ['manager', 'accountant', 'owner'];
    if (elevatedRoles.includes(employee.role || '')) {
      return <Navigate to="/manager" replace />;
    }
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
}

/**
 * Shared loading spinner shown during auth initialization.
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
