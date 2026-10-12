# Ya Hala Group E-Portal - Quick Start Guide

## 🚀 Getting Started

### Admin Login
- **URL:** Your portal URL
- **Admin ID:** `031984`
- **Password:** `aaaa@1237`
- **Access:** Full system access (all companies)

### Employee Login
- **Company:** Select your company first
- **Employee IDs:** `10001`, `10002`, `10003`
- **Password:** `demo123`
- **Access:** Submit requests, view own data

---

## 📊 Analytics Dashboard

### Access
1. Login as admin
2. Click **Analytics** tab
3. View comprehensive data

### Features
- **Summary Cards:** Total requests, pending, employees, approval rate
- **Trends Tab:** Line and bar charts showing request activity over time
- **Distribution Tab:** Pie charts for request types and statuses
- **Insights Tab:** Key metrics and recommendations

### Actions
- **Change Period:** Select 7, 30, or 90 days from dropdown
- **Record Snapshot:** Click button to capture current state for historical tracking

---

## ⚙️ Company Settings

### Access
1. Login as admin
2. Click **Settings** tab
3. Configure all company policies

### Tabs

#### 1. Working Hours
- Set work start/end time (e.g., 08:00 - 17:00)
- Select working days (checkboxes)
- Weekend days calculated automatically

#### 2. Leave Policies
- Annual leave days (default: 21)
- Sick leave days (default: 30)
- Emergency leave days
- Carry forward limit
- Advance notice required
- Max consecutive days

#### 3. Advance Salary
- Toggle enable/disable
- Set max percentage (50%)
- Set min/max amounts
- Max requests per year
- Min service months

#### 4. Holidays
- Click "Add Holiday"
- Fill in date, names (EN/AR)
- Select type (National/Religious/Optional)
- Check "Recurring" if annual
- Delete with trash icon

#### 5. Notifications
- Toggle email notifications
- View SMTP configuration
- See active email types

### Save Changes
- Click "Save All Changes" button at top
- All settings saved at once

---

## 📧 Email Notifications

### Active Templates
✅ Request Submitted (to employee)
✅ Request Approved (to employee)
✅ Request Rejected (to employee)
✅ Approval Needed (to manager)
✅ Password Reset (to employee)

### Configuration
- **Host:** smtp.gmail.com
- **Port:** 587
- **From:** eportal@yahala.co
- **Status:** Configured and ready

### Currently
- Emails are **logged to console**
- To enable real sending: Configure SendGrid or update SMTP in code

---

## 🎯 Common Tasks

### Add a New Holiday
1. Settings → Holidays tab
2. Click "Add Holiday"
3. Enter date, name (English & Arabic)
4. Select type
5. Toggle recurring if needed
6. Click "Add Holiday"

### Change Working Hours
1. Settings → Working Hours tab
2. Modify start/end time
3. Select/deselect working days
4. Click "Save All Changes"

### View Request Trends
1. Analytics → Trends tab
2. Select time period
3. View line chart for daily activity
4. View bar chart for comparison

### Update Leave Policy
1. Settings → Leave Policies tab
2. Modify annual/sick/emergency days
3. Update carry forward limit
4. Change advance notice requirement
5. Click "Save All Changes"

---

## 🔧 Admin Operations

### Record Daily Snapshot
```
Purpose: Capture current statistics for historical tracking
When: Daily (manual or via cron)
How: Analytics tab → Click "Record Snapshot"
```

### Reset Password
```
Purpose: Reset employee password
Where: Settings tab → Password Reset Requests
Action: View pending requests, approve/reject
```

### View System Stats
```
Where: Settings tab → Admin Settings → System Statistics
Shows: Total requests, employees, companies, documents, etc.
```

---

## 📱 Key Screens

### Admin Dashboard
- **Analytics:** Charts and insights
- **Requests:** All requests with filters
- **Announcements:** Company-wide messages
- **Employees:** Employee management
- **Documents:** Document management
- **Companies:** Company management
- **Settings:** System configuration

### Employee Portal
- **Dashboard:** Quick stats and actions
- **Requests:** Submit and track requests
- **Calendar:** View approved leaves
- **Profile:** Personal information

---

## 🎨 Color Guide

- **Primary (Green):** `#7AC143` - Ya Hala brand color
- **Secondary (Dark Teal):** `#006B7D` - Corporate color
- **Accent (Turquoise):** `#00A89C` - Highlight color
- **Warning (Orange):** `#FFA500` - Pending status
- **Success (Green):** `#10B981` - Approved status
- **Error (Red):** `#DC2626` - Rejected status

---

## 💡 Pro Tips

### Analytics
- Record snapshots daily for best trend data
- Use 30-day view for monthly patterns
- Check insights tab for recommendations
- Export charts for presentations

### Settings
- Start with default values
- Test changes before full deployment
- Add holidays at year start
- Review policies quarterly

### Holidays
- Add all national holidays upfront
- Mark recurring for annual events
- Use Arabic names for clarity
- Include religious observances

### Notifications
- Keep email notifications enabled
- Monitor for delivery issues
- Update SMTP if changing email provider
- Test with actual email sending

---

## 🐛 Troubleshooting

### Analytics Not Loading
- Check internet connection
- Ensure admin is logged in
- Try recording a snapshot first

### Settings Not Saving
- Check all required fields filled
- Ensure valid number formats
- Look for error toast messages
- Refresh page and try again

### Holidays Not Appearing
- Check date format (YYYY-MM-DD)
- Ensure both EN and AR names provided
- Click "Add Holiday" button
- Save all changes

### Charts Not Displaying
- Record at least one snapshot
- Select appropriate time period
- Check browser console for errors
- Try different period (7/30/90 days)

---

## 📞 Support

### System Issues
- Check browser console (F12)
- Review error messages
- Check network tab for failed requests

### Data Issues
- Verify data in Settings
- Check holiday dates
- Confirm working days selected

### Email Issues
- Verify SMTP configuration
- Check email notifications enabled
- Test with actual email service

---

## 🎓 Training Resources

### For Employees
- How to submit a request
- How to track request status
- How to view leave balance
- How to request password reset

### For Managers
- How to review requests
- How to approve/reject
- How to view team calendar
- How to add comments

### For Admins
- How to manage employees
- How to configure settings
- How to view analytics
- How to manage holidays

---

## 🔒 Security Best Practices

1. **Change default admin password**
2. **Use strong employee passwords**
3. **Enable email notifications**
4. **Review access logs regularly**
5. **Backup data periodically**
6. **Test settings in non-production first**
7. **Limit admin access to trusted users**

---

## 📈 Success Metrics

Track these in Analytics:
- Request submission rate
- Average approval time
- Request type distribution
- Employee adoption rate
- Pending request backlog
- Approval vs rejection ratio

---

## 🎯 Next Steps After Setup

1. ✅ Configure company settings
2. ✅ Add all public holidays
3. ✅ Test email notifications
4. ✅ Train employees and managers
5. ✅ Record first analytics snapshot
6. ✅ Review and adjust policies

---

## 📚 Additional Documentation

- `BUSINESS_REQUIREMENTS.md` - Complete business rules
- `TECHNICAL_ARCHITECTURE.md` - System architecture
- `DATABASE_SCHEMA.md` - Data structure
- `IMPLEMENTATION_STATUS.md` - Feature status
- `ANALYTICS_AND_SETTINGS_COMPLETE.md` - Latest features

---

**Last Updated:** November 6, 2025
**Version:** 2.0
**Status:** Production Ready ✅
