import React from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { FirstTimeSetup } from '../components/FirstTimeSetup';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Route wrapper for /setup – delegates to the existing FirstTimeSetup component.
 */
export function FirstTimeSetupPage() {
  const navigate = useNavigate();

  const employeeData = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('firstTimeSetupEmployee') || '{}');
    } catch {
      return {};
    }
  })();

  const handleComplete = () => {
    toast.success('Setup complete! Please login with your new password.');
    navigate('/login', { replace: true });
  };

  const handleSkip = async () => {
    try {
      if (!employeeData.id) {
        toast.error('Employee data not found. Please login again.');
        navigate('/login', { replace: true });
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee/skip-first-time-setup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ employee_id: employeeData.id }),
        },
      );

      const data = await response.json();

      if (data.success) {
        sessionStorage.removeItem('firstTimeSetupEmployee');
        toast.success(data.message || 'Setup skipped. You can complete your profile later.');
        navigate('/login', { replace: true });
      } else {
        toast.error(data.message || 'Failed to skip setup.');
      }
    } catch (error) {
      console.error('Skip setup error:', error);
      toast.error('An error occurred. Please try again.');
      navigate('/login', { replace: true });
    }
  };

  // If there's no employee data, bounce back to login
  if (!employeeData.id) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <FirstTimeSetup
      employee={employeeData}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
