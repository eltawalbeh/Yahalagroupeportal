# 📢 Announcement Board - Complete Guide

## 🎯 Overview

The Announcement Board is a comprehensive company-wide communication system that enables administrators to broadcast important messages, updates, and notifications to all employees or specific companies.

---

## ✨ Features Implemented

### ✅ **Core Features**
- ✅ Create, edit, and delete announcements
- ✅ **Priority Levels**: Urgent, Important, Info
- ✅ **Pin to Top**: Keep important announcements visible
- ✅ **Read Receipts**: Track who has read each announcement
- ✅ **Company Targeting**: Send to all companies or specific ones
- ✅ **Bilingual Support**: Full Arabic/English content
- ✅ **Auto Notifications**: Employees get notified automatically
- ✅ **Dismiss & Mark Read**: Employees can manage their view

---

## 👨‍💼 Admin Features

### **1. Create Announcement**

**Location**: Admin Dashboard → Announcements Tab

**Fields:**
- **Priority** (Required): Info | Important | Urgent
  - `Info`: General information (gray badge)
  - `Important`: Notable updates (primary badge)
  - `Urgent`: Critical messages (red badge, always visible)

- **Title** (Required): 
  - English title
  - Arabic title (optional)

- **Message** (Required):
  - English message
  - Arabic message (optional)

- **Target Companies** (Optional):
  - Leave empty to send to all companies
  - Check specific companies to limit audience

- **Pin to Top** (Optional):
  - Check to pin announcement at the top
  - Pinned announcements stay visible even after read

**Workflow:**
1. Click "New Announcement" button
2. Fill in the form
3. Select priority level
4. Choose target companies (optional)
5. Pin if needed
6. Click "Create Announcement"
7. All eligible employees receive notifications automatically

---

### **2. Edit Announcement**

**How to Edit:**
1. Click the "Edit" button on any announcement card
2. Modify any field
3. Click "Update Announcement"
4. Changes are immediately visible to all employees

**Best Practices:**
- ✅ Edit typos or clarify messages
- ✅ Update priority if urgency changes
- ⚠️ Avoid changing the core message (employees may have already read it)
- ✅ Add Arabic translation if initially missed

---

### **3. Pin/Unpin Announcements**

**Purpose**: Keep important messages at the top of the list

**How to Pin:**
1. Click "Pin" button on announcement card
2. Announcement moves to top
3. All pinned announcements appear before unpinned ones

**How to Unpin:**
1. Click "Unpin" button on pinned announcement
2. Announcement returns to chronological order

**Use Cases:**
- Holiday schedules
- Policy changes
- Ongoing initiatives
- Emergency contact information

---

### **4. View Read Receipts**

**Purpose**: See who has read your announcement

**How to View:**
1. Click "View Receipts" button on announcement card
2. Modal shows list of employees who marked it as read
3. Includes employee name and timestamp

**Information Shown:**
- Employee name (English & Arabic)
- Read timestamp
- Badge indicating "Read" status

**Use Cases:**
- Ensure critical messages were seen
- Follow up with employees who haven't read
- Compliance tracking for policy announcements
- Measure engagement

---

### **5. Delete Announcement**

**Warning**: This action cannot be undone!

**How to Delete:**
1. Click "Delete" button on announcement card
2. Confirm deletion in alert dialog
3. Announcement and all read receipts are permanently deleted

**When to Delete:**
- Outdated information
- Event has passed
- Duplicate announcements
- Erroneous posts

---

## 👤 Employee Features

### **1. View Announcements**

**Location**: Company Portal (automatically displayed at top)

**Display:**
- Announcements appear as cards below "Leave Balance"
- Urgent announcements highlighted with red border
- Important announcements highlighted with primary border
- Sorted by: Pinned first, then by date (newest first)
- Only unread announcements shown (except pinned urgent)

---

### **2. Mark as Read**

**How to Mark:**
- Click "Mark as Read" button on announcement card
- Announcement disappears from view (unless pinned urgent)
- Read receipt sent to admin

**Auto-dismiss:**
- Click the "X" button to dismiss and mark as read simultaneously
- Quick way to acknowledge and remove

---

### **3. Priority Indicators**

Employees see different visual cues based on priority:

**Urgent** 🚨
- Red border (2px)
- Destructive red background tint
- AlertTriangle icon
- Always visible even after read (if pinned)

**Important** 🔔
- Primary color border
- Primary background tint
- Bell icon
- Hidden after mark as read

**Info** ℹ️
- Standard styling
- Info icon
- Hidden after mark as read

---

## 🎨 Visual Design

### **Admin View**
```
┌─────────────────────────────────────────┐
│ 📢 Announcement Board                    │
│ Create and manage company announcements  │
│                          [New Announcement]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🚨 [Urgent] [Pinned]                     │
│ System Maintenance This Weekend          │
│ Our systems will be down for maintenance │
│ from Friday 6 PM to Sunday 6 AM...      │
│                                          │
│ Posted: Oct 15, 2025  •  Companies: All │
│                                          │
│ [View Receipts] [Unpin] [Edit] [Delete] │
└─────────────────────────────────────────┘
```

### **Employee View**
```
┌─────────────────────────────────────────┐
│ 🚨 [Urgent]                          [X] │
│ System Maintenance This Weekend          │
│ Our systems will be down for maintenance │
│ from Friday 6 PM to Sunday 6 AM...      │
│                                          │
│ Oct 15, 2025      [Mark as Read]        │
└─────────────────────────────────────────┘
```

---

## 💡 Use Cases & Examples

### **1. Holiday Announcement**

**Admin Creates:**
```
Priority: Important
Title: Eid Al-Fitr Holiday Schedule
Message: The office will be closed from April 21-25 for Eid Al-Fitr.
         Regular operations resume on April 26.
Pin: Yes
Companies: All
```

**Result:**
- All employees see announcement on portal
- Pinned at top for visibility
- Employees mark as read after noting dates
- Admin tracks read receipts to ensure awareness

---

### **2. Urgent Security Alert**

**Admin Creates:**
```
Priority: Urgent
Title: URGENT: Update Your Password
Message: We detected suspicious activity. All employees must change
         their passwords within 24 hours. Visit the Profile page.
Pin: Yes
Companies: All
```

**Result:**
- Red alert appears on all employee portals
- Stays visible even after reading (pinned urgent)
- Admin tracks who has seen it via read receipts
- Follow up with employees who haven't read

---

### **3. Company-Specific Update**

**Admin Creates:**
```
Priority: Info
Title: New Manager at Ya Hala for Travel & Tours
Message: Please welcome Sarah Ahmed as the new Operations Manager.
Pin: No
Companies: Ya Hala for Travel & Tours only
```

**Result:**
- Only employees of selected company see it
- Employees at other companies don't see it
- Targeted communication
- No unnecessary noise for irrelevant employees

---

### **4. Policy Change**

**Admin Creates:**
```
Priority: Important
Title: Updated Leave Policy
Message: Effective immediately, employees can carry forward up to 5
         days of unused annual leave to the next year. Read the full
         policy in the employee handbook.
Pin: Yes
Companies: All
```

**Result:**
- Important policy change highlighted
- Pinned for extended visibility
- Read receipts provide compliance evidence
- Can be referenced if questions arise

---

## 🔔 Notification System

### **When Announcement is Created:**

**Admin Creates → System Auto-sends Notifications**

**For Urgent:**
```javascript
{
  type: 'announcement_urgent',
  title: 'Urgent Announcement',
  message: announcement.title,
  employee_id: [all matching employees]
}
```

**For Important/Info:**
```javascript
{
  type: 'announcement',
  title: 'New Announcement',
  message: announcement.title,
  employee_id: [all matching employees]
}
```

**Notification Behavior:**
- Appears in notification bell (top right)
- Shows unread count badge
- Click to go to Company Portal
- Persists until read

---

## 📊 Read Receipt Analytics

### **Tracking Metrics:**
- Total announcements sent
- Percentage read per announcement
- Time to read (posting → first read)
- Employees who haven't read

### **Example Read Receipt Display:**
```
┌─────────────────────────────────────┐
│ Read Receipts                        │
│ See who has read this announcement   │
├─────────────────────────────────────┤
│ Ahmed Hassan                  [Read] │
│ Read at: Oct 15, 2025 2:30 PM       │
├─────────────────────────────────────┤
│ Sarah Mohammed                [Read] │
│ Read at: Oct 15, 2025 3:15 PM       │
├─────────────────────────────────────┤
│ Mohammed Ali                  [Read] │
│ Read at: Oct 15, 2025 4:00 PM       │
└─────────────────────────────────────┘
```

---

## 🛠️ Technical Details

### **Backend API Routes:**

1. **Create Announcement**
   ```
   POST /admin/announcements
   Body: { title, title_ar, message, message_ar, priority, company_ids, pinned }
   ```

2. **Get Announcements**
   ```
   GET /announcements?company_id={id}
   Returns: Filtered and sorted announcements
   ```

3. **Update Announcement**
   ```
   PATCH /admin/announcements/:id
   Body: { any fields to update }
   ```

4. **Delete Announcement**
   ```
   DELETE /admin/announcements/:id
   Also deletes all read receipts
   ```

5. **Mark as Read**
   ```
   POST /announcements/:id/read
   Body: { employee_id }
   ```

6. **Get Read Receipts**
   ```
   GET /admin/announcements/:id/receipts
   Returns: Array of read receipts with employee data
   ```

### **Data Structure:**

**Announcement:**
```typescript
{
  id: string,
  title: string,
  title_ar?: string,
  message: string,
  message_ar?: string,
  priority: 'urgent' | 'important' | 'info',
  company_ids: number[], // Empty = all companies
  pinned: boolean,
  created_at: string,
  updated_at?: string,
  created_by: 'admin'
}
```

**Read Receipt:**
```typescript
{
  announcement_id: string,
  employee_id: number,
  read_at: string
}
```

### **Storage:**
- **Announcements**: `announcement:{id}`
- **Read Receipts**: `announcement_read:{announcement_id}:{employee_id}`

---

## 📱 Mobile Responsiveness

The announcement board is fully mobile-optimized:

**Admin Dashboard (Mobile):**
- Horizontal scrollable tabs
- Touch-friendly cards
- Modal forms adapt to screen size
- Read receipts in scrollable list

**Employee Portal (Mobile):**
- Full-width announcement cards
- Easy tap targets for actions
- Swipe to dismiss (coming soon)
- Native-feeling interactions

---

## ♿ Accessibility

- ✅ Keyboard navigation support
- ✅ Screen reader compatible (ARIA labels)
- ✅ High contrast mode support
- ✅ Focus indicators
- ✅ Semantic HTML structure

---

## 🌐 Bilingual Support

### **Admin Interface:**
- All UI labels in English/Arabic
- Form supports both languages
- Preview shows selected language

### **Employee Interface:**
- Displays content in user's language
- Falls back to English if Arabic not provided
- Language toggle affects UI and content

### **Best Practices:**
- Always provide both English and Arabic content
- Use proper RTL formatting for Arabic text
- Test both language views before publishing

---

## 🎓 Training Guide

### **For Admins:**

**Week 1: Basic Operations**
- Create simple info announcement
- Edit and update content
- Delete old announcements

**Week 2: Advanced Features**
- Use priority levels effectively
- Pin important messages
- Target specific companies

**Week 3: Analytics**
- View read receipts
- Track engagement
- Follow up on unread

### **For Employees:**

**Onboarding:**
- Announcements appear automatically
- Click "Mark as Read" to acknowledge
- Use "X" to quickly dismiss
- Check notification bell for new updates

---

## ❓ FAQ

**Q: Can I schedule announcements for future posting?**
A: Not yet implemented. Currently all announcements post immediately. This is planned for Phase 4.

**Q: Can I attach files to announcements?**
A: Not yet implemented. Coming in Phase 4 as part of rich content support.

**Q: How long should announcements stay active?**
A: Best practice: Delete after 30 days or when no longer relevant. Keep pinned announcements as long as they're important.

**Q: Can employees comment on announcements?**
A: Not yet implemented. Two-way announcement discussions are planned for Phase 4.

**Q: What happens if I delete an announcement someone hasn't read yet?**
A: The announcement and notification are immediately removed. Use with caution for important messages.

**Q: Can I edit priority after posting?**
A: Yes! Use the Edit button to change priority at any time.

**Q: Do read receipts show WHO read when?**
A: Yes! Click "View Receipts" to see complete list with timestamps.

---

## 🚀 What's Next (Future Enhancements)

### **Phase 4 - Advanced Features:**
1. **Scheduled Posting**: Set future publish date/time
2. **File Attachments**: PDF, images, documents
3. **Rich Text Editor**: Formatting, lists, links
4. **Announcement Categories**: HR, IT, General, Events
5. **Expiry Dates**: Auto-archive after date
6. **Reactions**: 👍 Like, ❤️ Love, etc.
7. **Comments**: Enable discussion threads
8. **Draft Mode**: Save and review before posting
9. **Templates**: Reusable announcement templates
10. **Email Integration**: Send via email too

---

## ✅ Success Metrics

Track these KPIs to measure effectiveness:

1. **Read Rate**: % of employees who read within 24 hours
2. **Engagement**: Average time to first read
3. **Reach**: % of target audience notified
4. **Response**: Follow-up actions taken (if applicable)
5. **Satisfaction**: Employee feedback on usefulness

**Targets:**
- 90%+ read rate for urgent announcements within 24 hours
- 70%+ read rate for important announcements within 3 days
- 50%+ read rate for info announcements within 1 week

---

## 📞 Support

**For Issues:**
1. Check this guide first
2. Contact IT Support
3. Report bugs via admin feedback

**For Training:**
1. Schedule training session with IT
2. Watch tutorial videos (coming soon)
3. Practice in test environment

---

*Last Updated: October 15, 2025*
*Version: 1.0.0*
*Feature: Announcement Board*
