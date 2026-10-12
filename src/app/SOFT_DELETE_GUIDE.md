# 🗑️ Soft Delete System Guide - Ya Hala E-Portal

## 📖 Table of Contents
1. [What is Soft Delete?](#what-is-soft-delete)
2. [Benefits](#benefits)
3. [How It Works](#how-it-works)
4. [Using the System](#using-the-system)
5. [API Reference](#api-reference)
6. [Examples](#examples)

---

## 🤔 What is Soft Delete?

**Soft Delete** = Mark records as deleted instead of permanently removing them from the database.

### Hard Delete (Old Way):
```typescript
await kv.del('employee:123'); // ❌ GONE FOREVER!
```

### Soft Delete (New Way):
```typescript
await softDelete.softDelete('employee:123', 'admin', 'Terminated');
// ✅ Record still exists but hidden - can be restored!
```

---

## ✨ Benefits

### 1. **Data Recovery** 
- **Undo mistakes**: "Oops, I didn't mean to delete that!"
- **Restore accidentally deleted records** with one click

### 2. **Audit Trail**
- Track who deleted what and when
- Keep complete history of deletions
- Meet compliance requirements

### 3. **Data Integrity**
- No broken references
- Related data remains intact
- Better database consistency

### 4. **Regulatory Compliance**
- Some industries require keeping deleted data
- Support for GDPR, HIPAA, SOX requirements
- Complete audit logs

---

## ⚙️ How It Works

### When You Soft Delete:
```typescript
// Original Record
{
  id: 123,
  full_name: "Ahmed Ali",
  position: "Manager"
}

// After Soft Delete
{
  id: 123,
  full_name: "Ahmed Ali",
  position: "Manager",
  deleted: true,                    // ✅ Marked as deleted
  deleted_at: "2025-11-07T10:30:00Z",
  deleted_by: "admin",
  deletion_reason: "Left company",
  can_restore: true
}
```

### Filtering in Queries:
All GET endpoints automatically filter out soft-deleted records unless you specify `include_deleted=true`:

```typescript
// Normal query - only active records
GET /admin/employees
// Returns: Active employees only

// Query with deleted records
GET /admin/employees?include_deleted=true
// Returns: Active + deleted employees
```

---

## 🎯 Using the System

### For Admins (UI):

#### 1. **Settings Tab → Soft Delete Manager**
- View all soft-deleted employees and requests
- See deletion statistics
- Restore deleted records
- Permanently delete records

#### 2. **Deleting a Record**
When you click "Delete" on an employee or request:
- **Default**: Soft delete (can be restored)
- **With Shift+Click** (future feature): Permanent delete

#### 3. **Restoring a Record**
1. Go to **Settings Tab**
2. Scroll to **Soft Delete Manager**
3. Find the deleted record
4. Click **Restore**
5. Record is back! ✅

#### 4. **Permanent Delete**
⚠️ **WARNING**: This CANNOT be undone!
1. Go to **Settings Tab**
2. Scroll to **Soft Delete Manager**
3. Find the deleted record
4. Click **Delete Forever**
5. Confirm the action
6. Record is permanently removed

---

## 📡 API Reference

### Soft Delete Endpoints

#### 1. Soft Delete a Record
```http
POST /make-server-fdcde35a/soft-delete
Content-Type: application/json

{
  "key": "employee:123",
  "deletedBy": "admin",
  "reason": "Employee terminated"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully soft deleted: employee:123"
}
```

---

#### 2. Restore a Record
```http
POST /make-server-fdcde35a/soft-delete/restore
Content-Type: application/json

{
  "key": "employee:123",
  "restoredBy": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully restored: employee:123",
  "record": { /* restored record data */ }
}
```

---

#### 3. Get Deleted Records
```http
GET /make-server-fdcde35a/soft-delete/deleted/employee:
```

**Response:**
```json
{
  "success": true,
  "records": [
    {
      "id": 123,
      "full_name": "Ahmed Ali",
      "deleted": true,
      "deleted_at": "2025-11-07T10:30:00Z",
      "deleted_by": "admin",
      "deletion_reason": "Terminated"
    }
  ],
  "count": 1
}
```

---

#### 4. Get Deletion Statistics
```http
GET /make-server-fdcde35a/soft-delete/stats/employee:
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "active": 95,
    "deleted": 5,
    "deletionRate": "5.00%"
  }
}
```

---

#### 5. Bulk Soft Delete
```http
POST /make-server-fdcde35a/soft-delete/bulk
Content-Type: application/json

{
  "keys": ["employee:123", "employee:456"],
  "deletedBy": "admin",
  "reason": "Department closure"
}
```

---

#### 6. Permanent Delete
```http
DELETE /make-server-fdcde35a/soft-delete/permanent
Content-Type: application/json

{
  "key": "employee:123",
  "deletedBy": "admin"
}
```

⚠️ **This is permanent and cannot be undone!**

---

## 💻 Examples

### Example 1: Soft Delete an Employee
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/admin/employees/123`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    // No permanent=true, so it's a soft delete
  }
);

// Employee is soft deleted - can be restored later
```

### Example 2: Permanent Delete an Employee
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/admin/employees/123?permanent=true`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
  }
);

// Employee is PERMANENTLY deleted - cannot be restored!
```

### Example 3: Restore a Deleted Employee
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/soft-delete/restore`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({
      key: 'employee:123',
      restoredBy: 'admin'
    })
  }
);

// Employee is restored and active again!
```

### Example 4: Get All Deleted Employees
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/admin/employees?include_deleted=true`,
  {
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
  }
);

const data = await response.json();
const deletedEmployees = data.employees.filter(emp => emp.deleted);
```

### Example 5: Using Soft Delete Utility Functions
```typescript
import * as softDelete from './soft-delete.tsx';

// Soft delete
await softDelete.softDelete('employee:123', 'admin', 'Terminated');

// Restore
await softDelete.restore('employee:123', 'admin');

// Bulk delete
await softDelete.bulkSoftDelete(
  ['employee:123', 'employee:456'],
  'admin',
  'Department restructuring'
);

// Filter out deleted records
const employees = await getValuesByPrefix('employee:');
const activeEmployees = softDelete.filterDeleted(employees);

// Get only deleted records
const deletedEmployees = softDelete.getDeleted(employees);
```

---

## 🔐 Security Considerations

1. **Only Admins Can Delete**: Regular employees cannot delete records
2. **Audit Logging**: All deletions are logged with timestamp and user
3. **Two-Step Permanent Delete**: Requires soft delete first, then permanent delete
4. **Confirmation Required**: UI requires confirmation before permanent delete

---

## 🧹 Automatic Cleanup

The system supports automatic cleanup of old soft-deleted records:

```typescript
// Clean up records deleted more than 30 days ago
await softDelete.cleanupOldDeletions('employee:', 30, 'system');
```

You can set up a cron job to run this periodically.

---

## 📊 Monitoring

### View Statistics in Admin Dashboard:
1. Go to **Settings Tab**
2. Open **Soft Delete Manager**
3. View statistics cards showing:
   - Total records
   - Active records
   - Deleted records
   - Deletion rate

---

## 🎓 Best Practices

### ✅ DO:
- Use soft delete for user-triggered deletions
- Keep deletion reasons descriptive
- Regularly review deleted records
- Set up automatic cleanup for old deletions
- Train admins on restore procedures

### ❌ DON'T:
- Use permanent delete unless absolutely necessary
- Delete without a reason
- Keep deleted records forever (use cleanup)
- Skip the confirmation dialogs

---

## 🆘 Troubleshooting

### Issue: Deleted record still appears
**Solution**: Check if `include_deleted=true` is in your query parameters

### Issue: Cannot restore a record
**Solution**: Check `can_restore` field - some records may be marked as non-restorable

### Issue: Permanent delete button doesn't work
**Solution**: Record must be soft-deleted first before permanent deletion

---

## 🎉 Summary

**Soft Delete System gives you:**
- ✅ Safety net for accidental deletions
- ✅ Complete audit trail
- ✅ Regulatory compliance
- ✅ Data recovery capabilities
- ✅ Better data integrity

**Remember:**
- **Soft Delete** = Temporary, can restore
- **Permanent Delete** = Forever, cannot undo!

---

**Questions?** Check the admin settings tab or contact system administrator.
