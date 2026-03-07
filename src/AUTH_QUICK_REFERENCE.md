# Auth Features - Quick Reference Card

## 🚀 Quick Start

### Test Remember Me (30 seconds)
```
1. Open app → Login page
2. Enter: 1001 / password123
3. ✅ Check "Remember me"
4. Click Login
5. Close browser
6. Reopen app
7. ✓ Auto-logged in to portal
```

### Test Password Reset (2 minutes)
```
Employee:
1. Click "Forgot Password?"
2. Enter ID: 1001
3. Submit

Admin:
4. Login: 031984 / aaaa@1237
5. Settings tab
6. Click "Reset Password"
7. Enter: newpass123
8. Submit

Employee:
9. Login with: 1001 / newpass123
10. ✓ Success!
```

## 📝 Code Snippets

### Use Remember Me in Login
```typescript
import { saveRemember, saveEmployeeSession, clearRemember } from '../utils/authLocal';

// On successful login
if (rememberMe) {
  saveRemember(employeeId, isAdmin);
  if (!isAdmin) {
    saveEmployeeSession(employee, company);
  }
} else {
  clearRemember();
}
```

### Auto-login in AuthContext
```typescript
import { loadRemember, loadEmployeeSession } from '../utils/authLocal';

useEffect(() => {
  const remembered = loadRemember();
  if (!remembered) return;
  
  if (remembered.isAdmin) {
    setIsAdmin(true);
  } else {
    const session = loadEmployeeSession();
    if (session) {
      setEmployee(session.employee);
      setCompany(session.company);
    }
  }
}, []);
```

### Request Password Reset (Client)
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/auth/request-password-reset`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ employee_id: employeeId })
  }
);
```

### Get Pending Requests (Admin)
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/admin/password-reset-requests`,
  {
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
  }
);
const { requests } = await response.json();
```

### Reset Password (Admin)
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/admin/reset-employee-password`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({
      request_id: requestId,
      employee_id: employeeId,
      new_password: newPassword
    })
  }
);
```

## 🔧 Utility Functions

```typescript
// /utils/authLocal.ts

// Save remember me (30 day expiry)
saveRemember(employeeId: string, isAdmin: boolean): void

// Save employee session for auto-login
saveEmployeeSession(employee: any, company: any): void

// Load remember data (null if expired)
loadRemember(): { employeeId, isAdmin, timestamp } | null

// Load employee session
loadEmployeeSession(): { employee, company } | null

// Clear all auth data (on logout)
clearRemember(): void

// Check if remember me exists
hasRememberMe(): boolean
```

## 📁 File Locations

```
/utils/authLocal.ts                    ← Utility functions
/pages/Login.tsx                       ← Remember me + Forgot password
/contexts/AuthContext.tsx              ← Auto-login logic
/components/PasswordResetRequests.tsx  ← Admin UI component
/pages/AdminDashboard.tsx              ← Settings tab (includes component)
/supabase/functions/server/index.tsx   ← Server endpoints
```

## 🗄️ Data Storage

### localStorage Keys
```
ya_hala_remember
  └─ { employeeId, isAdmin, timestamp }

ya_hala_session (employees only)
  └─ { employee: {...}, company: {...} }
```

### KV Store Keys
```
password_reset_request:{uuid}
  └─ { id, employee_id, status, created_at, ... }

notification:{uuid}
  └─ { employee_id, message, is_read, ... }

employee:{id}
  └─ { id, password, full_name, ... }
```

## 🔗 Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/request-password-reset` | POST | Employee requests reset |
| `/admin/password-reset-requests` | GET | List pending requests |
| `/admin/reset-employee-password` | POST | Admin resets password |

## ⚙️ Configuration

```typescript
// 30-day expiration for remember me
const TTL = 30 * 24 * 60 * 60 * 1000;

// Auto-refresh interval for admin dashboard
const REFRESH_INTERVAL = 30000; // 30 seconds

// Password validation
const MIN_PASSWORD_LENGTH = 6;
```

## 🐛 Debugging Commands

### Check Remember Me Data
```javascript
// Browser console
console.log(localStorage.getItem('ya_hala_remember'));
console.log(localStorage.getItem('ya_hala_session'));
```

### Clear Remember Me
```javascript
// Browser console
localStorage.removeItem('ya_hala_remember');
localStorage.removeItem('ya_hala_session');
location.reload();
```

### Check Session Age
```javascript
// Browser console
const data = JSON.parse(localStorage.getItem('ya_hala_remember'));
const days = (Date.now() - data.timestamp) / (24 * 60 * 60 * 1000);
console.log(`Session age: ${days.toFixed(1)} days`);
```

### Simulate Expired Session
```javascript
// Browser console
const data = JSON.parse(localStorage.getItem('ya_hala_remember'));
data.timestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
localStorage.setItem('ya_hala_remember', JSON.stringify(data));
location.reload(); // Should redirect to login
```

## 🎯 Common Tasks

### Disable Remember Me for a User
```typescript
// On logout
import { clearRemember } from '../utils/authLocal';
clearRemember();
```

### Change Remember Me Duration
```typescript
// /utils/authLocal.ts
const TTL = 7 * 24 * 60 * 60 * 1000; // Change to 7 days
```

### Change Password Requirements
```typescript
// /components/PasswordResetRequests.tsx
if (newPassword.length < 8) { // Change min length
  toast.error('Password must be at least 8 characters');
  return;
}
```

### Change Auto-Refresh Rate
```typescript
// /components/PasswordResetRequests.tsx
const interval = setInterval(fetchRequests, 60000); // 60 seconds
```

## 🔒 Security Notes

### ✅ Safe Practices
- No passwords in localStorage
- 30-day session expiration
- Auto-clear on logout
- Admin-only password reset
- Notification audit trail

### ⚠️ Future Improvements
- Hash passwords in database
- Add rate limiting
- Track failed login attempts
- Add password complexity rules
- Implement session tokens

## 📊 Monitoring

### Key Metrics to Track
```typescript
// Analytics events to add
analytics.track('remember_me_used', { employee_id });
analytics.track('auto_login_success', { is_admin });
analytics.track('password_reset_requested', { employee_id });
analytics.track('password_reset_completed', { admin_id });
```

### Error Logging
```typescript
// Production error tracking
try {
  const session = loadRemember();
} catch (error) {
  errorLogger.log('auth_remember_failed', error);
}
```

## 🎓 Learn More

- `AUTH_ENHANCEMENTS.md` - Complete feature documentation
- `CLEAN_AUTH_ARCHITECTURE.md` - Architecture deep dive
- `IMPLEMENTATION_SUMMARY.md` - Overall system guide

---

**Quick Access:**
- Remember Me: Login page checkbox
- Password Reset (Employee): "Forgot Password?" link
- Password Reset (Admin): Settings tab → Password Reset Requests

**Support:** Check AUTH_ENHANCEMENTS.md for testing instructions
