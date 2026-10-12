# Test Credentials & Testing Guide

## 🧪 Testing the Employee Invitation System

### Admin Access
```
Employee ID: 031984
Password: [REDACTED — contact your system administrator]
```
> ⚠️ **Security Note:** Never commit credentials to version control.
> Store secrets in environment variables or a secrets manager.

## 📋 Step-by-Step Testing Instructions

### **Part 1: Admin Creates Employee**

1. **Login as Admin:**
   - Go to login page
   - Enter admin credentials above
   - You'll be redirected to Admin Dashboard

2. **Navigate to Employee Management:**
   - Click "Employee Management" from admin menu
   - Or use the navigation

3. **Create New Employee:**
   - Click "Add Employee" button
   - Fill in the form:
     ```
     Employee ID: 99999 (or any unique number)
     Email (Username): test.employee@yahala.co
     Full Name (English): Test Employee
     Full Name (Arabic): موظف تجريبي (optional)
     Company: Ya Hala for Travel & Tours
     Position: Test Position
     ```
   - Click "Add Employee"

4. **Verify Success:**
   - You should see success message: "Employee added successfully! Invitation email has been sent."
   - Check the console logs in Network tab for email sending confirmation
   - Employee should appear in the employee list

### **Part 2: Check Invitation Email**

Since this is a test environment, check the server logs for the email details:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for email service logs showing:
   ```
   📧 RESEND EMAIL SERVICE
   To: test.employee@yahala.co
   Subject: Welcome to Ya Hala Group E-Portal
   ✅ EMAIL SENT SUCCESSFULLY!
   ```

**Note:** The temporary password will be visible in the logs. Copy it for the next step.

Example temporary password format: `ABC456xyz`

### **Part 3: Employee First-Time Login**

1. **Logout from Admin:**
   - Click logout or open a new incognito/private window

2. **Login as New Employee:**
   - Go to login page
   - Enter credentials:
     ```
     Username: test.employee@yahala.co (or 99999)
     Password: [temporary password from email/logs]
     ```
   - Click "Sign In"

3. **Verify First-Time Setup Redirect:**
   - You should see: "Welcome! Please complete your profile setup."
   - You'll be redirected to the First-Time Setup page
   - Progress bar should show 4 steps

### **Part 4: Complete First-Time Setup**

#### **Step 1: Change Password** ✅
1. Enter the temporary password in "Current Password"
2. Create a new password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit):
   ```
   Example: TestPass123
   ```
3. Confirm the new password
4. Click "Change Password & Continue"
5. Verify success message and move to Step 2

#### **Step 2: Personal Information** ✅
1. Fill in required fields:
   ```
   Personal Phone: +973 12345678
   Emergency Contact Name: John Doe
   Emergency Contact Phone: +973 87654321
   ```
2. Click "Continue"
3. Move to Step 3

#### **Step 3: Profile Photo** ✅
1. Click "Upload Photo"
2. Select any image file (max 5MB)
3. Preview should appear
4. Click "Continue"
5. Move to Step 4

#### **Step 4: Language Preference** ✅
1. Choose language: English 🇬🇧 or Arabic 🇧🇭
2. Click "Complete Setup"
3. Wait for processing
4. You should see: "Setup completed successfully!"

### **Part 5: Final Login**

1. **Automatic Logout:**
   - After setup, you'll be logged out automatically
   - Message: "Setup complete! Please login with your new password."

2. **Login with New Password:**
   - Go to login page
   - Enter:
     ```
     Username: test.employee@yahala.co (or 99999)
     Password: [your new password, e.g., TestPass123]
     ```
   - Click "Sign In"

3. **Verify Access:**
   - You should be redirected to the Company Portal
   - See welcome message with employee name
   - Profile photo should be visible
   - All services should be accessible

## ✅ Validation Checklist

### Email Uniqueness:
- [ ] Try creating another employee with same email
- [ ] Should show error: "Email already exists"

### Login Methods:
- [ ] Login with Email + Password
- [ ] Login with Employee ID + Password
- [ ] Both should work identically

### Password Validation:
- [ ] Try weak password (should fail)
- [ ] Try password without uppercase (should fail)
- [ ] Try password without digit (should fail)
- [ ] Try password < 8 characters (should fail)
- [ ] Try strong password (should succeed)

### Required Fields:
- [ ] Try skipping password change (should not allow)
- [ ] Try empty phone number (should show error)
- [ ] Try empty emergency contact (should show error)
- [ ] Try skipping photo upload (should show error)

### Photo Upload:
- [ ] Try uploading file > 5MB (should show error)
- [ ] Try uploading non-image file (should show error)
- [ ] Upload valid image (should succeed)

### Navigation:
- [ ] Click "Back" button in setup (should work)
- [ ] Progress bar should update correctly
- [ ] Cannot skip steps or jump ahead

## 🔍 Debugging Tips

### If invitation email doesn't send:
1. Check RESEND_API_KEY is configured
2. Check console logs for errors
3. Verify email service logs in server console

### If first-time setup doesn't trigger:
1. Check employee data has `is_first_time_login: true`
2. Check login response includes `requiresSetup: true`
3. Verify sessionStorage has employee data

### If photo upload fails:
1. Check file size < 5MB
2. Check file is valid image type
3. Check Supabase Storage bucket exists
4. Check server logs for upload errors

### If password change fails:
1. Verify temporary password is correct
2. Check new password meets requirements
3. Check employee exists in database
4. Check server endpoint logs

## 📊 Expected Database State

After completing setup, employee object should look like:

```javascript
{
  id: 99999,
  email: "test.employee@yahala.co",
  full_name: "Test Employee",
  full_name_ar: "موظف تجريبي",
  company_id: 1,
  position: "Test Position",
  
  // Password fields
  password: "[HASHED — never stored in plaintext]",
  temporary_password: null, // Cleared after first use
  password_changed_at: "2025-11-06T12:00:00.000Z",
  
  // Setup completion flags
  is_first_time_login: false,
  profile_completed: true,
  profile_completed_at: "2025-11-06T12:05:00.000Z",
  
  // Personal information
  phone: "+973 12345678",
  emergency_contact_name: "John Doe",
  emergency_contact_phone: "+973 87654321",
  preferred_language: "en",
  profile_photo_url: "https://[supabase-url]/storage/v1/object/sign/...",
  
  // Timestamps
  created_at: "2025-11-06T11:55:00.000Z"
}
```

## 🎯 Success Criteria

✅ Admin can create employee with email  
✅ Invitation email sent automatically  
✅ Employee can login with email  
✅ First-time setup triggers automatically  
✅ All 4 steps are mandatory  
✅ Password validation works  
✅ Phone number validation works  
✅ Photo upload works  
✅ Language selection works  
✅ Setup completion saves all data  
✅ Employee can login with new password  
✅ Portal access granted after setup  

---

## 🚨 Common Issues & Solutions

### Issue: Email not sending
**Solution:** Check that RESEND_API_KEY is set correctly. The system will still create the employee, just without the email.

### Issue: Can't access first-time setup
**Solution:** Clear sessionStorage and try logging in again with temporary password.

### Issue: Photo upload stuck
**Solution:** Check file size and format. Try a smaller image (< 2MB).

### Issue: Password requirements too strict
**Solution:** This is by design for security. Use a password manager to generate strong passwords.

### Issue: Can't login after setup
**Solution:** Make sure you're using the NEW password, not the temporary one.

---

**Happy Testing! 🎉**
