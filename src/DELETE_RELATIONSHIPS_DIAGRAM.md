# 🗑️ CASCADING DELETE - RELATIONSHIPS DIAGRAM

Visual guide to what gets deleted and how relationships cascade.

---

## 📊 Data Relationship Tree

```
COMPANY
  │
  ├─── EMPLOYEE (many)
  │      │
  │      ├─── REQUEST (many)
  │      │      ├─── COMMENT (many)
  │      │      ├─── NOTIFICATION (many)
  │      │      └─── MEDICAL_REPORT (storage file)
  │      │
  │      ├─── DOCUMENT (many)
  │      │      └─── FILE (storage file)
  │      │
  │      ├─── NOTIFICATION (many)
  │      │
  │      ├─── COMMENT (many)
  │      │
  │      ├─── PROFILE_PHOTO (storage file)
  │      │
  │      ├─── ANNOUNCEMENT_READ (many)
  │      │
  │      └─── AUTH_USER (Supabase Auth)
  │
  └─── (Company has no direct data, only through employees)
```

---

## 🔄 Deletion Cascade Flows

### **1. DELETE EMPLOYEE → Cascades to:**

```
🗑️ DELETE employee:123
      ↓
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  1️⃣ Find & Delete ALL REQUESTS                              │
│     request:* WHERE employee_id = 123                        │
│     ├─ request:001 ✅ Deleted                                │
│     ├─ request:002 ✅ Deleted                                │
│     └─ request:003 ✅ Deleted                                │
│                                                               │
│  2️⃣ Find & Delete ALL NOTIFICATIONS                         │
│     notification:* WHERE employee_id = 123                   │
│     ├─ notification:001 ✅ Deleted                           │
│     ├─ notification:002 ✅ Deleted                           │
│     └─ notification:003 ✅ Deleted                           │
│                                                               │
│  3️⃣ Find & Delete ALL DOCUMENTS + FILES                     │
│     document:* WHERE employee_id = 123                       │
│     ├─ document:001                                          │
│     │   ├─ metadata ✅ Deleted                               │
│     │   └─ storage file ✅ Deleted                           │
│     ├─ document:002                                          │
│     │   ├─ metadata ✅ Deleted                               │
│     │   └─ storage file ✅ Deleted                           │
│                                                               │
│  4️⃣ Find & Delete ALL COMMENTS                              │
│     comment:* WHERE user_id = 123                            │
│     ├─ comment:001 ✅ Deleted                                │
│     ├─ comment:002 ✅ Deleted                                │
│                                                               │
│  5️⃣ Delete PROFILE PHOTO                                    │
│     storage://profile-photos/emp_123.jpg ✅ Deleted          │
│                                                               │
│  6️⃣ Find & Delete ANNOUNCEMENT READ RECEIPTS                │
│     announcement_read:*:123                                  │
│     ├─ announcement_read:001:123 ✅ Deleted                  │
│     ├─ announcement_read:002:123 ✅ Deleted                  │
│                                                               │
│  7️⃣ Delete AUTH USER                                        │
│     Supabase Auth → user_id ✅ Deleted                       │
│                                                               │
│  8️⃣ Delete EMPLOYEE RECORD                                  │
│     employee:123 ✅ Deleted                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      ↓
✅ COMPLETE - Nothing left behind!
```

---

### **2. DELETE COMPANY (force=true) → Cascades to:**

```
🗑️ DELETE company:456?force=true
      ↓
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  1️⃣ Find ALL EMPLOYEES in company                           │
│     employee:* WHERE company_id = 456                        │
│     ├─ employee:001                                          │
│     ├─ employee:002                                          │
│     └─ employee:003                                          │
│                                                               │
│  2️⃣ For EACH employee → cascadeDeleteEmployee()             │
│     ├─ Delete employee:001                                   │
│     │   ├─ requests (15) ✅                                  │
│     │   ├─ notifications (42) ✅                             │
│     │   ├─ documents (8) ✅                                  │
│     │   ├─ comments (12) ✅                                  │
│     │   ├─ profile photo ✅                                  │
│     │   ├─ announcement reads (25) ✅                        │
│     │   └─ auth user ✅                                      │
│     │                                                         │
│     ├─ Delete employee:002                                   │
│     │   └─ (same cascade)                                    │
│     │                                                         │
│     └─ Delete employee:003                                   │
│         └─ (same cascade)                                    │
│                                                               │
│  3️⃣ Delete COMPANY RECORD                                   │
│     company:456 ✅ Deleted                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      ↓
✅ COMPLETE - Company + ALL employees + ALL their data deleted!
```

---

### **3. DELETE REQUEST → Cascades to:**

```
🗑️ DELETE request:789
      ↓
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  1️⃣ Find & Delete ALL COMMENTS                              │
│     comment:* WHERE request_id = 789                         │
│     ├─ comment:001 ✅ Deleted                                │
│     ├─ comment:002 ✅ Deleted                                │
│     └─ comment:003 ✅ Deleted                                │
│                                                               │
│  2️⃣ Find & Delete ALL NOTIFICATIONS                         │
│     notification:* WHERE request_id = 789                    │
│     ├─ notification:001 ✅ Deleted                           │
│     └─ notification:002 ✅ Deleted                           │
│                                                               │
│  3️⃣ Delete MEDICAL REPORT (if exists)                       │
│     storage://medical-reports/report_789.pdf ✅ Deleted      │
│                                                               │
│  4️⃣ Delete REQUEST RECORD                                   │
│     request:789 ✅ Deleted                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      ↓
✅ COMPLETE - Request + comments + notifications deleted!
```

---

### **4. DELETE ANNOUNCEMENT → Cascades to:**

```
🗑️ DELETE announcement:101
      ↓
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  1️⃣ Delete IMAGE FILE (if exists)                           │
│     storage://announcements/img_101.jpg ✅ Deleted           │
│                                                               │
│  2️⃣ Find & Delete ALL READ RECEIPTS                         │
│     announcement_read:101:*                                  │
│     ├─ announcement_read:101:emp_001 ✅ Deleted              │
│     ├─ announcement_read:101:emp_002 ✅ Deleted              │
│     └─ announcement_read:101:emp_003 ✅ Deleted              │
│                                                               │
│  3️⃣ Find & Delete RELATED NOTIFICATIONS                     │
│     notification:* WHERE announcement_id = 101               │
│     ├─ notification:001 ✅ Deleted                           │
│     └─ notification:002 ✅ Deleted                           │
│                                                               │
│  4️⃣ Delete ANNOUNCEMENT RECORD                              │
│     announcement:101 ✅ Deleted                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      ↓
✅ COMPLETE - Announcement + image + receipts deleted!
```

---

### **5. DELETE DOCUMENT → Cascades to:**

```
🗑️ DELETE document:202
      ↓
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  1️⃣ Delete FILE from storage                                │
│     storage://documents/doc_202.pdf ✅ Deleted               │
│                                                               │
│  2️⃣ Delete METADATA                                         │
│     document:202 ✅ Deleted                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      ↓
✅ COMPLETE - Document + file deleted!
```

---

## 🔍 Lookup Tables

### **What Deletes What:**

| You Delete | Also Deletes |
|------------|--------------|
| **Employee** | Requests, Notifications, Documents, Files, Comments, Profile Photo, Announcement Reads, Auth User |
| **Company (force)** | All Employees + everything they own (recursive) |
| **Request** | Comments, Notifications, Medical Reports |
| **Announcement** | Image, Read Receipts, Notifications |
| **Document** | Storage File |

---

### **Storage Bucket Cleanup:**

| Bucket Name | Cleaned When | File Type |
|-------------|--------------|-----------|
| `make-fdcde35a-profile-photos` | Employee deleted | Profile photos |
| `make-fdcde35a-documents` | Employee/Document deleted | Employee documents |
| `make-fdcde35a-medical-reports` | Request deleted | Medical reports |
| `make-fdcde35a-announcements` | Announcement deleted | Announcement images |

---

### **Database Keys Cleaned:**

| Pattern | Description | Cleaned When |
|---------|-------------|--------------|
| `employee:{id}` | Employee record | Employee deleted |
| `request:{id}` | Request record | Request deleted or Employee deleted |
| `notification:{id}` | Notification | Related entity deleted |
| `document:{id}` | Document metadata | Document or Employee deleted |
| `comment:{id}` | Comment | Request or Employee deleted |
| `announcement:{id}` | Announcement | Announcement deleted |
| `announcement_read:{ann_id}:{emp_id}` | Read receipt | Announcement or Employee deleted |
| `company:{id}` | Company record | Company deleted |

---

## 🎨 Visual Flow Examples

### **Scenario 1: Delete Employee with Active Requests**

```
BEFORE:
├─ employee:emp_001
├─ request:req_001 (employee_id: emp_001)
│   ├─ comment:com_001
│   └─ notification:not_001
├─ request:req_002 (employee_id: emp_001)
│   └─ comment:com_002
├─ document:doc_001 (employee_id: emp_001)
│   └─ storage file: /documents/file1.pdf
└─ notification:not_002 (employee_id: emp_001)

↓ DELETE employee:emp_001

AFTER:
(empty - everything deleted!)
```

---

### **Scenario 2: Delete Company with 3 Employees (force=true)**

```
BEFORE:
company:123
  ├─ employee:001 (15 requests, 8 documents)
  ├─ employee:002 (20 requests, 5 documents)
  └─ employee:003 (10 requests, 3 documents)

↓ DELETE company:123?force=true

AFTER:
(empty - company + 3 employees + 45 requests + 16 documents ALL deleted!)
```

---

### **Scenario 3: Delete Request with Comments**

```
BEFORE:
request:req_001
  ├─ comment:com_001 (user: admin)
  ├─ comment:com_002 (user: emp_001)
  ├─ notification:not_001 (employee: emp_001)
  └─ medical_report.pdf (storage)

↓ DELETE request:req_001

AFTER:
(empty - request + comments + notification + file ALL deleted!)
```

---

## 🛡️ Safety Mechanisms

### **Company Deletion Protection:**

```
DELETE company:123 (without ?force=true)
      ↓
   Has employees?
      ├─ YES → ❌ BLOCKED
      │        "Cannot delete company with assigned employees"
      │        "Add ?force=true to delete all employees"
      │
      └─ NO → ✅ ALLOWED
               Delete company only
```

### **Error Handling:**

```
Deletion Step Fails
      ↓
   Log Warning
      ↓
   Continue to Next Step
      ↓
   Return Deletion Log
      ↓
deletionLog shows which succeeded/failed
```

---

## 📊 Deletion Log Format

Every delete operation returns:

```json
{
  "success": true,
  "message": "Item deleted",
  "messageAr": "تم الحذف",
  "deletionLog": {
    "main_item": boolean,      // true = deleted, false = failed
    "related_count": number,   // how many related items deleted
    "file": boolean            // storage file deleted?
  }
}
```

**Examples:**

```json
// Employee deletion
{
  "employee": true,
  "requests": 15,
  "notifications": 42,
  "documents": 8,
  "comments": 12,
  "profilePhoto": true,
  "announcementReads": 25,
  "authUser": true
}

// Company deletion (force)
{
  "company": true,
  "employees": 45,
  "totalRequests": 532,
  "totalNotifications": 1240,
  "totalDocuments": 178
}

// Request deletion
{
  "request": true,
  "comments": 5,
  "notifications": 3,
  "documents": 1
}
```

---

## 🎯 Key Takeaways

1. **Nothing is orphaned** - All related data is deleted
2. **Storage is cleaned** - Files are removed from buckets
3. **Auth is updated** - User accounts are deleted
4. **Safe by default** - Company deletion protected
5. **Detailed logging** - You know exactly what was deleted
6. **Error resilient** - Continues even if some steps fail
7. **Bilingual** - Works for Arabic and English users

---

**When you delete, we DELETE! 🗑️✨**
