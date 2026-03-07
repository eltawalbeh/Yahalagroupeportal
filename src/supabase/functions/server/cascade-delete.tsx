// 🗑️ CASCADING DELETE HELPERS - Ensure complete data removal from everywhere
// ===========================================================================
// These functions ensure that when you delete something, it's completely
// removed from the database, storage buckets, and all related data.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper to get values by prefix
async function getValuesByPrefix(prefix: string): Promise<any[]> {
  try {
    const values = await kv.getByPrefix(prefix);
    return values.filter(v => v && typeof v === 'object');
  } catch (error) {
    console.error(`Error in getValuesByPrefix for prefix "${prefix}":`, error);
    return [];
  }
}

/**
 * Completely deletes an employee and ALL related data
 * ✅ Deletes: requests, notifications, documents, comments, profile photo, announcement reads, auth user
 * @param employeeId - The employee ID to delete
 * @returns Object with success status and detailed deletion log
 */
export async function cascadeDeleteEmployee(employeeId: string) {
  const deletionLog = {
    employee: false,
    requests: 0,
    notifications: 0,
    documents: 0,
    comments: 0,
    profilePhoto: false,
    announcementReads: 0,
    authUser: false
  };

  try {
    const employee = await kv.get(`employee:${employeeId}`);
    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log(`🗑️  Cascading DELETE employee: ${employeeId} (${employee.full_name})`);

    // 1. Delete all requests by this employee
    const allRequests = await getValuesByPrefix('request:');
    const employeeRequests = allRequests.filter((r: any) => r.employee_id === employeeId);
    for (const request of employeeRequests) {
      await kv.del(`request:${request.id}`);
      deletionLog.requests++;
    }

    // 2. Delete all notifications for this employee
    const allNotifications = await getValuesByPrefix('notification:');
    const employeeNotifications = allNotifications.filter((n: any) => n.employee_id === employeeId);
    for (const notification of employeeNotifications) {
      await kv.del(`notification:${notification.id}`);
      deletionLog.notifications++;
    }

    // 3. Delete all documents + storage files
    const allDocuments = await getValuesByPrefix('document:');
    const employeeDocuments = allDocuments.filter((d: any) => d.employee_id === employeeId);
    for (const doc of employeeDocuments) {
      try {
        await supabase.storage.from('make-fdcde35a-documents').remove([doc.file_path]);
      } catch (e) {
        console.log(`  ⚠️  Failed to delete document file: ${doc.file_path}`);
      }
      await kv.del(`document:${doc.id}`);
      deletionLog.documents++;
    }

    // 4. Delete all comments by this employee
    const allComments = await getValuesByPrefix('comment:');
    const employeeComments = allComments.filter((c: any) => c.user_id === employeeId);
    for (const comment of employeeComments) {
      await kv.del(`comment:${comment.id}`);
      deletionLog.comments++;
    }

    // 5. Delete profile photo from storage
    if (employee.profile_photo) {
      try {
        const photoPath = employee.profile_photo.split('/').pop();
        await supabase.storage.from('make-fdcde35a-profile-photos').remove([photoPath]);
        deletionLog.profilePhoto = true;
      } catch (e) {
        console.log(`  ⚠️  Failed to delete profile photo`);
      }
    }

    // 6. Delete announcement read receipts
    const allReadReceipts = await getValuesByPrefix('announcement_read:');
    const employeeReceipts = allReadReceipts.filter((r: any) => r.employee_id === employeeId);
    for (const receipt of employeeReceipts) {
      await kv.del(`announcement_read:${receipt.announcement_id}:${employeeId}`);
      deletionLog.announcementReads++;
    }

    // 7. Delete from Supabase Auth
    if (employee.auth_user_id) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(employee.auth_user_id);
        if (!error) {
          deletionLog.authUser = true;
        }
      } catch (e) {
        console.log(`  ⚠️  Failed to delete auth user`);
      }
    }

    // 8. Delete employee record
    await kv.del(`employee:${employeeId}`);
    deletionLog.employee = true;

    console.log(`  ✅ Deleted:`, deletionLog);
    return { success: true, deletionLog };

  } catch (error) {
    console.error(`❌ Cascade delete employee failed:`, error);
    throw error;
  }
}

/**
 * Completely deletes a request and ALL related data
 * ✅ Deletes: comments, notifications, uploaded documents (medical reports, etc.)
 * @param requestId - The request ID to delete
 */
export async function cascadeDeleteRequest(requestId: string) {
  const deletionLog = {
    request: false,
    comments: 0,
    notifications: 0,
    documents: 0
  };

  try {
    const request = await kv.get(`request:${requestId}`);
    if (!request) {
      throw new Error('Request not found');
    }

    console.log(`🗑️  Cascading DELETE request: ${requestId}`);

    // 1. Delete all comments
    const allComments = await getValuesByPrefix('comment:');
    const requestComments = allComments.filter((c: any) => c.request_id === requestId);
    for (const comment of requestComments) {
      await kv.del(`comment:${comment.id}`);
      deletionLog.comments++;
    }

    // 2. Delete all notifications
    const allNotifications = await getValuesByPrefix('notification:');
    const requestNotifications = allNotifications.filter((n: any) => n.request_id === requestId);
    for (const notification of requestNotifications) {
      await kv.del(`notification:${notification.id}`);
      deletionLog.notifications++;
    }

    // 3. Delete uploaded medical reports
    if (request.medical_report_url) {
      try {
        const filePath = request.medical_report_url.split('/').pop();
        await supabase.storage.from('make-fdcde35a-medical-reports').remove([filePath]);
        deletionLog.documents++;
      } catch (e) {
        console.log('  ⚠️  Failed to delete medical report');
      }
    }

    // 4. Delete request
    await kv.del(`request:${requestId}`);
    deletionLog.request = true;

    console.log(`  ✅ Deleted:`, deletionLog);
    return { success: true, deletionLog };

  } catch (error) {
    console.error(`❌ Cascade delete request failed:`, error);
    throw error;
  }
}

/**
 * Completely deletes an announcement and ALL related data
 * ✅ Deletes: image file, read receipts, notifications
 * @param announcementId - The announcement ID to delete
 */
export async function cascadeDeleteAnnouncement(announcementId: string) {
  const deletionLog = {
    announcement: false,
    image: false,
    readReceipts: 0,
    notifications: 0
  };

  try {
    const announcement = await kv.get(`announcement:${announcementId}`);
    if (!announcement) {
      throw new Error('Announcement not found');
    }

    console.log(`🗑️  Cascading DELETE announcement: ${announcementId}`);

    // 1. Delete uploaded image
    if (announcement.image_url) {
      try {
        const imagePath = announcement.image_url.split('/').pop();
        await supabase.storage.from('make-fdcde35a-announcements').remove([imagePath]);
        deletionLog.image = true;
      } catch (e) {
        console.log('  ⚠️  Failed to delete announcement image');
      }
    }

    // 2. Delete read receipts
    const readReceipts = await getValuesByPrefix(`announcement_read:${announcementId}:`);
    for (const receipt of readReceipts) {
      await kv.del(`announcement_read:${announcementId}:${receipt.employee_id}`);
      deletionLog.readReceipts++;
    }

    // 3. Delete notifications
    const allNotifications = await getValuesByPrefix('notification:');
    const announcementNotifications = allNotifications.filter(
      (n: any) => n.type === 'announcement' && n.metadata?.announcement_id === announcementId
    );
    for (const notification of announcementNotifications) {
      await kv.del(`notification:${notification.id}`);
      deletionLog.notifications++;
    }

    // 4. Delete announcement
    await kv.del(`announcement:${announcementId}`);
    deletionLog.announcement = true;

    console.log(`  ✅ Deleted:`, deletionLog);
    return { success: true, deletionLog };

  } catch (error) {
    console.error(`❌ Cascade delete announcement failed:`, error);
    throw error;
  }
}

/**
 * Completely deletes a company and optionally ALL employees + their data
 * ✅ Deletes: all employees, their requests, notifications, documents, etc.
 * @param companyId - The company ID to delete
 * @param forceCascade - If true, deletes all employees; if false, blocks if employees exist
 */
export async function cascadeDeleteCompany(companyId: string, forceCascade: boolean = false) {
  const deletionLog = {
    company: false,
    employees: 0,
    totalRequests: 0,
    totalNotifications: 0,
    totalDocuments: 0
  };

  try {
    const company = await kv.get(`company:${companyId}`);
    if (!company) {
      throw new Error('Company not found');
    }

    const allEmployees = await getValuesByPrefix('employee:');
    const companyEmployees = allEmployees.filter((e: any) => e.company_id === parseInt(companyId));

    if (companyEmployees.length > 0 && !forceCascade) {
      throw new Error('Cannot delete company with assigned employees. Set forceCascade=true to delete all employees.');
    }

    console.log(`🗑️  Cascading DELETE company: ${companyId} (${companyEmployees.length} employees)`);

    // Delete all employees
    for (const employee of companyEmployees) {
      const result = await cascadeDeleteEmployee(employee.id);
      if (result.success) {
        deletionLog.employees++;
        deletionLog.totalRequests += result.deletionLog.requests;
        deletionLog.totalNotifications += result.deletionLog.notifications;
        deletionLog.totalDocuments += result.deletionLog.documents;
      }
    }

    // Delete company
    await kv.del(`company:${companyId}`);
    deletionLog.company = true;

    console.log(`  ✅ Deleted:`, deletionLog);
    return { success: true, deletionLog };

  } catch (error) {
    console.error(`❌ Cascade delete company failed:`, error);
    throw error;
  }
}

/**
 * Completely deletes a document and its storage file
 * ✅ Deletes: database record + storage file
 * @param documentId - The document ID to delete
 */
export async function cascadeDeleteDocument(documentId: string) {
  const deletionLog = {
    document: false,
    storageFile: false
  };

  try {
    const document = await kv.get(`document:${documentId}`);
    if (!document) {
      throw new Error('Document not found');
    }

    console.log(`🗑️  Cascading DELETE document: ${documentId}`);

    // 1. Delete from storage
    const bucketName = 'make-fdcde35a-documents';
    try {
      await supabase.storage.from(bucketName).remove([document.file_path]);
      deletionLog.storageFile = true;
    } catch (e) {
      console.log('  ⚠️  Failed to delete file from storage');
    }

    // 2. Delete metadata
    await kv.del(`document:${documentId}`);
    deletionLog.document = true;

    console.log(`  ✅ Deleted:`, deletionLog);
    return { success: true, deletionLog };

  } catch (error) {
    console.error(`❌ Cascade delete document failed:`, error);
    throw error;
  }
}
