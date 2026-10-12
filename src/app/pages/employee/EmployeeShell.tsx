import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { EmployeeLayout } from '../../components/layout/EmployeeLayout';
import { CompanyPortal } from '../CompanyPortal';
import { LeaveRequest } from '../LeaveRequest';
import { AdvanceRequest } from '../AdvanceRequest';
import { EntryPermissionRequest } from '../EntryPermissionRequest';
import { TicketRequest } from '../TicketRequest';
import { RequestHistory } from '../RequestHistory';
import { EmployeeProfile } from '../EmployeeProfile';
import { AnnouncementView } from '../../components/AnnouncementView';

/**
 * Employee portal shell — owns the EmployeeLayout and renders
 * the correct sub-page based on the current URL.
 *
 * URL mapping:
 *   /employee           → dashboard (CompanyPortal)
 *   /employee/leave     → LeaveRequest
 *   /employee/advance   → AdvanceRequest
 *   /employee/entry     → EntryPermissionRequest
 *   /employee/ticket    → TicketRequest (annual ticket + re-entry visa)
 *   /employee/history   → RequestHistory
 *   /employee/announcements → AnnouncementView
 *   /employee/profile   → EmployeeProfile
 */

// Map URL sub-paths to page IDs used by the sidebar
const PATH_TO_PAGE: Record<string, string> = {
  '': 'dashboard',
  'leave': 'leave',
  'advance': 'advance',
  'entry': 'entry',
  'ticket': 'ticket',
  'history': 'history',
  'announcements': 'announcements',
  'profile': 'profile',
};

const PAGE_TO_PATH: Record<string, string> = {
  'dashboard': '',
  'leave': 'leave',
  'advance': 'advance',
  'entry': 'entry',
  'ticket': 'ticket',
  'history': 'history',
  'announcements': 'announcements',
  'profile': 'profile',
};

export function EmployeeShell() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the sub-path after /employee/
  const subPath = location.pathname.replace(/^\/employee\/?/, '').replace(/\/$/, '');
  const activePage = PATH_TO_PAGE[subPath] || 'dashboard';

  const handleNavigate = (page: string) => {
    const path = PAGE_TO_PATH[page] ?? '';
    navigate(`/employee${path ? `/${path}` : ''}`, { replace: false });
  };

  const handleBack = () => navigate('/employee', { replace: false });
  const handleSuccess = () => navigate('/employee', { replace: false });

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <CompanyPortal
            onServiceSelect={(s) => handleNavigate(s)}
            onLogout={() => navigate('/login')}
          />
        );
      case 'leave':
        return (
          <LeaveRequest
            onBack={handleBack}
            onSuccess={handleSuccess}
            onNavigateToTickets={() => handleNavigate('ticket')}
          />
        );
      case 'advance':
        return <AdvanceRequest onBack={handleBack} onSuccess={handleSuccess} />;
      case 'entry':
        return <EntryPermissionRequest onBack={handleBack} onSuccess={handleSuccess} />;
      case 'ticket':
        return <TicketRequest onBack={handleBack} onSuccess={handleSuccess} />;
      case 'history':
        return <RequestHistory onBack={handleBack} />;
      case 'announcements':
        return <AnnouncementView />;
      case 'profile':
        return <EmployeeProfile onBack={handleBack} />;
      default:
        return (
          <CompanyPortal
            onServiceSelect={(s) => handleNavigate(s)}
            onLogout={() => navigate('/login')}
          />
        );
    }
  };

  return (
    <EmployeeLayout activePage={activePage} onNavigate={handleNavigate}>
      {renderContent()}
    </EmployeeLayout>
  );
}