import React, { useState } from 'react';
import { CheckCircle, XCircle, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { adminFetch } from '../utils/adminApi';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onSuccess: () => void;
  selectedIds: string[];
}

export function BulkActionsBar({ selectedCount, onClear, onSuccess, selectedIds }: BulkActionsBarProps) {
  const { t } = useLanguage();
  const { adminInfo } = useAuth();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: 'approved' | 'rejected') => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);

    try {
      const response = await adminFetch('/admin/requests/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ request_ids: selectedIds, status: action, notes: adminNotes || null }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(
          t(
            `${selectedIds.length} request(s) ${action === 'approved' ? 'approved' : 'rejected'}`,
            `تم ${action === 'approved' ? 'الموافقة على' : 'رفض'} ${selectedIds.length} طلب`
          )
        );
        setIsApproveDialogOpen(false);
        setIsRejectDialogOpen(false);
        setAdminNotes('');
        onSuccess();
        onClear();
      } else {
        toast.error(t('Failed to process requests', 'فشل معالجة الطلبات'));
      }
    } catch (error) {
      console.error('Error processing bulk action:', error);
      toast.error(t('An error occurred', 'حدث خطأ'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-2xl border-2 border-primary/20">
        <div className="flex items-center gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold">{selectedCount}</span>
            </div>
            <span className="text-sm font-medium">
              {t('requests selected', 'طلب محدد')}
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsApproveDialogOpen(true)}
              className="bg-[#7AC143] hover:bg-[#6AB133] text-white"
            >
              <CheckCircle className="w-4 h-4 me-2" />
              {t('Approve All', 'الموافقة على الكل')}
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsRejectDialogOpen(true)}
            >
              <XCircle className="w-4 h-4 me-2" />
              {t('Reject All', 'رفض الكل')}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Approve Selected Requests', 'الموافقة على الطلبات المحددة')}</DialogTitle>
            <DialogDescription>
              {t(
                `You are about to approve ${selectedCount} request(s). This action cannot be undone.`,
                `أنت على وشك الموافقة على ${selectedCount} طلب. لا يمكن التراجع عن هذا الإجراء.`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('Admin Notes (Optional)', 'ملاحظات المسؤول (اختياري)')}</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('Add notes for this bulk approval...', 'أضف ملاحظات لهذه الموافقة الجماعية...')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isProcessing}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button
              onClick={() => handleBulkAction('approved')}
              disabled={isProcessing}
              className="bg-[#7AC143] hover:bg-[#6AB133]"
            >
              {isProcessing && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t('Approve All', 'الموافقة على الكل')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Selected Requests', 'رفض الطلبات المحددة')}</DialogTitle>
            <DialogDescription>
              {t(
                `You are about to reject ${selectedCount} request(s). This action cannot be undone.`,
                `أنت على وشك رفض ${selectedCount} طلب. لا يمكن التراجع عن هذا الإجراء.`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('Reason for Rejection', 'سبب الرفض')}</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('Provide a reason for rejection...', 'قدم سبب الرفض...')}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isProcessing}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleBulkAction('rejected')}
              disabled={isProcessing || !adminNotes.trim()}
            >
              {isProcessing && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t('Reject All', 'رفض الكل')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}