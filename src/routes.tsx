import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './pages/RootLayout';
import { Login } from './pages/Login';
import { FirstTimeSetupPage } from './pages/FirstTimeSetupPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { EmployeeShell } from './pages/employee/EmployeeShell';
import {
  RedirectIfAuthenticated,
  RequireAdmin,
  RequireManager,
  RequireEmployee,
} from './components/RouteGuards';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      // Landing redirect
      { index: true, element: <Navigate to="/login" replace /> },

      // Login (redirects authenticated users away)
      {
        path: 'login',
        element: (
          <RedirectIfAuthenticated>
            <Login />
          </RedirectIfAuthenticated>
        ),
      },

      // First-time setup
      {
        path: 'setup',
        element: <FirstTimeSetupPage />,
      },

      // ── Admin routes ──────────────────────────────
      {
        path: 'admin/*',
        element: (
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        ),
      },

      // ── Manager / HR routes ───────────────────────
      {
        path: 'manager/*',
        element: (
          <RequireManager>
            <ManagerDashboard />
          </RequireManager>
        ),
      },

      // ── Employee routes ───────────────────────────
      {
        path: 'employee/*',
        element: (
          <RequireEmployee>
            <EmployeeShell />
          </RequireEmployee>
        ),
      },

      // Catch-all
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
]);
