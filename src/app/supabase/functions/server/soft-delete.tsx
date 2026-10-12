/**
 * Soft Delete System for Ya Hala E-Portal
 * 
 * Soft delete marks records as deleted instead of permanently removing them.
 * This allows for:
 * - Data recovery (undo deletions)
 * - Audit trails (who deleted what and when)
 * - Data integrity (no broken references)
 * - Compliance (regulatory requirements)
 */

import * as kv from './kv-retry.tsx';

export interface SoftDeleteMetadata {
  deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
  can_restore?: boolean;
}

export interface SoftDeletableRecord {
  [key: string]: any;
  deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

/**
 * Soft delete a record by marking it as deleted
 */
export async function softDelete(
  key: string,
  deletedBy: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const record = await kv.get(key);
    
    if (!record) {
      return {
        success: false,
        message: `Record not found: ${key}`
      };
    }

    // Check if already deleted
    if (record.deleted) {
      return {
        success: false,
        message: `Record already deleted: ${key}`
      };
    }

    // Mark as deleted
    const softDeletedRecord = {
      ...record,
      deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      deletion_reason: reason || 'No reason provided',
      can_restore: true
    };

    await kv.set(key, softDeletedRecord);

    console.log(`✅ Soft deleted: ${key} by ${deletedBy}`);

    return {
      success: true,
      message: `Successfully soft deleted: ${key}`
    };
  } catch (error) {
    console.error(`❌ Soft delete error for ${key}:`, error);
    return {
      success: false,
      message: `Failed to soft delete: ${error.message}`
    };
  }
}

/**
 * Restore a soft-deleted record
 */
export async function restore(
  key: string,
  restoredBy: string
): Promise<{ success: boolean; message: string; record?: any }> {
  try {
    const record = await kv.get(key);
    
    if (!record) {
      return {
        success: false,
        message: `Record not found: ${key}`
      };
    }

    if (!record.deleted) {
      return {
        success: false,
        message: `Record is not deleted: ${key}`
      };
    }

    if (record.can_restore === false) {
      return {
        success: false,
        message: `Record cannot be restored: ${key}`
      };
    }

    // Remove deletion metadata
    const restoredRecord = {
      ...record,
      deleted: false,
      restored_at: new Date().toISOString(),
      restored_by: restoredBy,
      // Keep deletion history for audit trail
      deletion_history: {
        deleted_at: record.deleted_at,
        deleted_by: record.deleted_by,
        deletion_reason: record.deletion_reason,
        restored_at: new Date().toISOString(),
        restored_by: restoredBy
      }
    };

    // Remove old deletion fields
    delete restoredRecord.deleted_at;
    delete restoredRecord.deleted_by;
    delete restoredRecord.deletion_reason;
    delete restoredRecord.can_restore;

    await kv.set(key, restoredRecord);

    console.log(`✅ Restored: ${key} by ${restoredBy}`);

    return {
      success: true,
      message: `Successfully restored: ${key}`,
      record: restoredRecord
    };
  } catch (error) {
    console.error(`❌ Restore error for ${key}:`, error);
    return {
      success: false,
      message: `Failed to restore: ${error.message}`
    };
  }
}

/**
 * Permanently delete a soft-deleted record
 */
export async function permanentDelete(
  key: string,
  deletedBy: string,
  requireSoftDeleted: boolean = true
): Promise<{ success: boolean; message: string }> {
  try {
    const record = await kv.get(key);
    
    if (!record) {
      return {
        success: false,
        message: `Record not found: ${key}`
      };
    }

    if (requireSoftDeleted && !record.deleted) {
      return {
        success: false,
        message: `Record must be soft deleted first: ${key}`
      };
    }

    // Store in deletion log before permanent deletion
    const deletionLog = {
      key,
      record,
      permanently_deleted_at: new Date().toISOString(),
      permanently_deleted_by: deletedBy,
      original_deleted_at: record.deleted_at,
      original_deleted_by: record.deleted_by
    };

    await kv.set(`deletion_log:${key}:${Date.now()}`, deletionLog);
    
    // Permanently delete
    await kv.del(key);

    console.log(`✅ Permanently deleted: ${key} by ${deletedBy}`);

    return {
      success: true,
      message: `Permanently deleted: ${key}`
    };
  } catch (error) {
    console.error(`❌ Permanent delete error for ${key}:`, error);
    return {
      success: false,
      message: `Failed to permanently delete: ${error.message}`
    };
  }
}

/**
 * Filter out soft-deleted records from an array
 */
export function filterDeleted<T extends SoftDeletableRecord>(
  records: T[],
  includeDeleted: boolean = false
): T[] {
  if (includeDeleted) {
    return records;
  }
  return records.filter(record => !record.deleted);
}

/**
 * Get only soft-deleted records from an array
 */
export function getDeleted<T extends SoftDeletableRecord>(records: T[]): T[] {
  return records.filter(record => record.deleted === true);
}

/**
 * Bulk soft delete multiple records
 */
export async function bulkSoftDelete(
  keys: string[],
  deletedBy: string,
  reason?: string
): Promise<{ success: boolean; results: any[] }> {
  const results = await Promise.all(
    keys.map(key => softDelete(key, deletedBy, reason))
  );

  const successCount = results.filter(r => r.success).length;
  
  return {
    success: successCount === keys.length,
    results
  };
}

/**
 * Bulk restore multiple records
 */
export async function bulkRestore(
  keys: string[],
  restoredBy: string
): Promise<{ success: boolean; results: any[] }> {
  const results = await Promise.all(
    keys.map(key => restore(key, restoredBy))
  );

  const successCount = results.filter(r => r.success).length;
  
  return {
    success: successCount === keys.length,
    results
  };
}

/**
 * Get all soft-deleted records by prefix
 */
export async function getDeletedByPrefix(prefix: string): Promise<any[]> {
  try {
    const allRecords = await kv.getByPrefix(prefix);
    return getDeleted(allRecords);
  } catch (error) {
    console.error(`Error getting deleted records for prefix ${prefix}:`, error);
    return [];
  }
}

/**
 * Clean up old soft-deleted records (auto-permanent delete after X days)
 */
export async function cleanupOldDeletions(
  prefix: string,
  daysOld: number = 30,
  deletedBy: string = 'system'
): Promise<{ success: boolean; count: number }> {
  try {
    const deletedRecords = await getDeletedByPrefix(prefix);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysOld * 24 * 60 * 60 * 1000));
    
    let permanentlyDeletedCount = 0;
    
    for (const record of deletedRecords) {
      if (record.deleted_at) {
        const deletedDate = new Date(record.deleted_at);
        if (deletedDate < cutoffDate) {
          // Find the key for this record
          const key = `${prefix}${record.id}`;
          await permanentDelete(key, deletedBy, false);
          permanentlyDeletedCount++;
        }
      }
    }

    console.log(`✅ Cleaned up ${permanentlyDeletedCount} old deletions for prefix: ${prefix}`);

    return {
      success: true,
      count: permanentlyDeletedCount
    };
  } catch (error) {
    console.error(`Error cleaning up old deletions for prefix ${prefix}:`, error);
    return {
      success: false,
      count: 0
    };
  }
}

/**
 * Get deletion statistics
 */
export async function getDeletionStats(prefix: string): Promise<{
  total: number;
  active: number;
  deleted: number;
  deletionRate: string;
}> {
  try {
    const allRecords = await kv.getByPrefix(prefix);
    const activeRecords = filterDeleted(allRecords, false);
    const deletedRecords = getDeleted(allRecords);
    
    const deletionRate = allRecords.length > 0 
      ? ((deletedRecords.length / allRecords.length) * 100).toFixed(2) + '%'
      : '0%';

    return {
      total: allRecords.length,
      active: activeRecords.length,
      deleted: deletedRecords.length,
      deletionRate
    };
  } catch (error) {
    console.error(`Error getting deletion stats for prefix ${prefix}:`, error);
    return {
      total: 0,
      active: 0,
      deleted: 0,
      deletionRate: '0%'
    };
  }
}
