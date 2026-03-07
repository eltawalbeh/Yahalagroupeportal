import { projectId, publicAnonKey } from './supabase/info';

/**
 * Sends a status update email to an employee when their request is approved or rejected.
 */
export async function sendRequestStatusEmail(
  employeeId: number,
  status: 'approved' | 'rejected',
  language: 'en' | 'ar' = 'ar',
  requestDetails?: any
) {
  try {
    const employee = await fetchEmployeeDetails(employeeId);
    if (!employee || !employee.email) {
      console.warn(`No email found for employee ${employeeId}`);
      return { success: false, message: 'Employee not found or has no email' };
    }

    const template = status === 'approved' ? 'requestApproved' : 'requestRejected';
    return await sendEmail(employee.email, template, language, requestDetails);

  } catch (error) {
    console.error('Error sending status email:', error);
    return { success: false, error };
  }
}

/**
 * Sends a password reset email to an employee with their new password.
 * Accepts the employee object directly to avoid unnecessary fetches.
 */
export async function sendPasswordResetEmail(
  employee: { email: string; full_name: string; full_name_ar?: string },
  newPassword: string,
  language: 'en' | 'ar' = 'ar'
) {
  try {
    if (!employee.email) {
      return { success: false, message: 'Employee has no email address' };
    }

    const template = 'passwordReset';
    
    // Ensure we pass the exact variable names used in the HTML template
    return await sendEmail(employee.email, template, language, {
      new_password: newPassword,
      full_name: employee.full_name,
      // Provide a fallback if Arabic name is missing to prevent template errors
      full_name_ar: employee.full_name_ar || employee.full_name 
    });

  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
}

// Helper to fetch employee details (kept for existing functionality)
async function fetchEmployeeDetails(employeeId: number) {
  try {
    const employeeRes = await fetch(
      `https://${projectId}.supabase.co/rest/v1/employees?id=eq.${employeeId}&select=email,full_name,full_name_ar`,
      {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    if (!employeeRes.ok) {
      console.error('Failed to fetch employee for email:', await employeeRes.text());
      return null;
    }
    
    const employees = await employeeRes.json();
    return employees[0] || null;
  } catch (e) {
    console.error("Exception fetching employee details:", e);
    return null;
  }
}

// Helper to send the actual email
async function sendEmail(email: string, template: string, language: string, data: any) {
  try {
    const emailRes = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/test-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email,
          template,
          language,
          data
        })
      }
    );

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error('Email service error:', errorText);
      return { success: false, message: `Email service error: ${emailRes.status}` };
    }

    return await emailRes.json();
  } catch (e) {
    console.error("Network error sending email:", e);
    return { success: false, error: e };
  }
}
