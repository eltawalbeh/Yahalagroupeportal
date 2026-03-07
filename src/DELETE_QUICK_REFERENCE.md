# 🗑️ CASCADING DELETE - QUICK REFERENCE

**One-page cheat sheet for deletion operations**

---

## 🚀 Quick Commands

```bash
# Delete employee (complete removal)
DELETE /make-server-fdcde35a/admin/employees/:id

# Delete company (safe mode - blocks if has employees)
DELETE /make-server-fdcde35a/admin/companies/:id

# Delete company (force cascade - deletes ALL employees)
DELETE /make-server-fdcde35a/admin/companies/:id?force=true

# Delete request
DELETE /make-server-fdcde35a/admin/requests/:id

# Delete announcement
DELETE /make-server-fdcde35a/admin/announcements/:id

# Delete document
DELETE /make-server-fdcde35a/documents/:id
```

---

## 📋 What Gets Deleted

| Operation | Deletes |
|-----------|---------|
| **Employee** | ✅ Employee<br>✅ All requests<br>✅ All notifications<br>✅ All documents + files<br>✅ All comments<br>✅ Profile photo<br>✅ Announcement reads<br>✅ Auth user |
| **Company (force)** | ✅ Company<br>✅ All employees<br>✅ Everything employees own |
| **Request** | ✅ Request<br>✅ All comments<br>✅ All notifications<br>✅ Medical reports |
| **Announcement** | ✅ Announcement<br>✅ Image file<br>✅ Read receipts<br>✅ Notifications |
| **Document** | ✅ Document metadata<br>✅ Storage file |

---

## 💻 Frontend Code Examples

### **Delete Employee:**
```typescript
const deleteEmployee = async (id: string) => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/admin/employees/${id}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    }
  );
  
  const data = await response.json();
  console.log('Deleted:', data.deletionLog);
};
```

### **Delete Company (with confirmation):**
```typescript
const deleteCompany = async (id: string, force: boolean = false) => {
  if (force) {
    const ok = confirm('Delete company AND all employees?');
    if (!ok) return;
  }

  const url = force 
    ? `.../ companies/${id}?force=true`
    : `.../companies/${id}`;

  await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
  });
};
```

### **Delete with Toast Notification:**
```typescript
const deleteWithToast = async (endpoint: string) => {
  const response = await fetch(endpoint, { method: 'DELETE' });
  const data = await response.json();
  
  if (data.success) {
    toast.success(t(data.message, data.messageAr));
  } else {
    toast.error(t(data.message, data.messageAr));
  }
};
```

---

## 🔍 Response Examples

### **Employee Deletion:**
```json
{
  "success": true,
  "message": "Employee and all related data deleted successfully",
  "messageAr": "تم حذف الموظف وجميع البيانات المرتبطة بنجاح",
  "deletionLog": {
    "employee": true,
    "requests": 15,
    "notifications": 42,
    "documents": 8,
    "comments": 12,
    "profilePhoto": true,
    "announcementReads": 25,
    "authUser": true
  }
}
```

### **Company Deletion (blocked):**
```json
{
  "success": false,
  "message": "Cannot delete company with assigned employees. Add ?force=true to delete all employees.",
  "messageAr": "لا يمكن حذف شركة بها موظفون. أضف ?force=true لحذف جميع الموظفين."
}
```

---

## ⚠️ Important Notes

### **⛔ Deletions are PERMANENT**
- No undo functionality
- All data is immediately removed
- Consider backups before deleting

### **🔒 Company Force Delete**
- Requires `?force=true` parameter
- Deletes ALL employees and their data
- Use with extreme caution

### **📊 Always Check Deletion Log**
- Shows what was actually deleted
- `false` values indicate failures
- Numbers show how many items deleted

### **🗂️ Storage Cleanup**
- Files are removed from buckets
- May take a few seconds
- Check deletion log for confirmation

---

## 🧪 Testing Checklist

```
✅ Delete employee → Verify all requests gone
✅ Delete employee → Check storage for profile photo removal
✅ Delete company (safe) → Should block if has employees
✅ Delete company (force) → Should delete all employees
✅ Delete request → Verify comments deleted
✅ Delete announcement → Check image removed from storage
✅ Check console logs → Should show deletion details
✅ Check deletion log → Should show counts
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Deletion log shows `false`** | Check console for error, file may not exist |
| **Storage file not deleted** | Verify file_path is correct, check bucket permissions |
| **Auth user not deleted** | Ensure `auth_user_id` exists and is valid |
| **Company delete blocked** | Add `?force=true` or reassign employees first |

---

## 📞 Common Scenarios

### **Scenario 1: Employee Leaves Company**
```typescript
// Delete everything
await deleteEmployee(employeeId);

// Deletion log shows:
// - 15 requests deleted
// - 8 documents deleted
// - Profile photo removed
// - Auth account deleted
```

### **Scenario 2: Close Down Company**
```typescript
// Force delete company + all employees
await deleteCompany(companyId, true);

// Deletion log shows:
// - Company deleted
// - 45 employees deleted
// - 532 requests deleted
// - 178 documents deleted
```

### **Scenario 3: Remove Old Request**
```typescript
// Delete request + related data
await deleteRequest(requestId);

// Deletion log shows:
// - Request deleted
// - 5 comments deleted
// - 3 notifications deleted
// - 1 medical report deleted
```

---

## 🎨 Visual Summary

```
DELETE EMPLOYEE
      ↓
   Cascades to:
      ├─ Requests ✅
      ├─ Notifications ✅
      ├─ Documents ✅
      ├─ Files ✅
      ├─ Comments ✅
      ├─ Photo ✅
      ├─ Reads ✅
      └─ Auth ✅

DELETE COMPANY (force=true)
      ↓
   Cascades to:
      ├─ All Employees ✅
      └─ (everything above) ✅

DELETE REQUEST
      ↓
   Cascades to:
      ├─ Comments ✅
      ├─ Notifications ✅
      └─ Medical Reports ✅

DELETE ANNOUNCEMENT
      ↓
   Cascades to:
      ├─ Image ✅
      ├─ Read Receipts ✅
      └─ Notifications ✅
```

---

## 📚 Documentation Files

1. **`/CASCADE_DELETE_DOCUMENTATION.md`** → Complete guide (400+ lines)
2. **`/COMPLETE_DELETE_SUMMARY.md`** → Implementation summary
3. **`/DELETE_RELATIONSHIPS_DIAGRAM.md`** → Visual diagrams
4. **`/DELETE_QUICK_REFERENCE.md`** → This file (quick reference)

---

## 🔗 Related Files

- **Implementation:** `/supabase/functions/server/cascade-delete.tsx`
- **Endpoints:** `/supabase/functions/server/index.tsx`

---

## ✅ Verification

After deletion, verify:

```typescript
// Check employee is gone
const employee = await kv.get('employee:123'); // null

// Check requests are gone
const requests = await getValuesByPrefix('request:');
const hasRequests = requests.some(r => r.employee_id === '123'); // false

// Check storage is clean
// Profile photo should return 404 from storage
```

---

**🗑️ When in doubt, check the deletion log! It tells you exactly what happened.**

---

**Last Updated:** November 7, 2025  
**Status:** Production Ready ✅
