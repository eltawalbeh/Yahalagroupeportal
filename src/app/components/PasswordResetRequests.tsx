import React, { useState, useEffect } from 'react';
import { Key, Clock, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { adminFetch } from '../utils/adminApi';

interface PasswordResetRequest {
  id: string;
  employee_id: number;
  employee_name: string;
  employee_name_ar?: string;
  status: string;
  created_at: string;
}

export function PasswordResetRequests() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<PasswordResetRequest | null>(null);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 180000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await adminFetch('/admin/password-reset-requests');
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        console.error('Server returned success=false:', data.message);
        toast.error(t(
          data.message || 'Failed to load password reset requests',
          'فشل تحميل طلبات إعادة تعيين كلمة المرور'
        ));
      }
    } catch (error) {
      console.error('Error fetching password reset requests:', error);
      toast.error(t(
        'Failed to load password reset requests.',
        'فشل تحميل طلبات إعادة تعيين كلمة المرور.'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedRequest || !newPassword) {
      toast.error(t('Please enter a new password', 'يرجى إدخال كلمة مرور جديدة'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('Password must be at least 6 characters', 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'));
      return;
    }
    setIsResetting(true);
    try {
      const response = await adminFetch('/admin/reset-employee-password', {
        method: 'POST',
        body: JSON.stringify({
          request_id: selectedRequest.id,
          employee_id: selectedRequest.employee_id,
          new_password: newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t(
          'Password reset successfully! Employee has been notified.',
          'تم إعادة تعيين كلمة المرور بنجاح! تم إخطار الموظف.'
        ));
        setSelectedRequest(null);
        setNewPassword('');
        fetchRequests();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(t('Failed to reset password. Please try again.', 'فشل إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      const response = await adminFetch(`/admin/password-reset-requests/${requestToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Request deleted successfully', 'تم حذف الطلب بنجاح'));
        setRequestToDelete(null);
        fetchRequests();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error(t('Failed to delete request. Please try again.', 'فشل حذف الطلب. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t('Password Reset Requests', 'طلبات إعادة تعيين كلمة المرور')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          {t('Password Reset Requests', 'طلبات إعادة تعيين كلمة المرور')}
        </CardTitle>
        <CardDescription>
          {t('Manage employee password reset requests', 'إدارة طلبات إعادة تعيين كلمات مرور الموظفين')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('No pending password reset requests', 'لا توجد طلبات إعادة تعيين كلمة مرور معلقة')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                {/* ── Employee info ── */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">
                      {t(request.employee_name, request.employee_name_ar || request.employee_name)}
                    </p>
                    <Badge variant="outline">ID: {request.employee_id}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(request.created_at)}</p>
                </div>

                {/* ── Action buttons ── */}
                <div className="flex items-center gap-2">

                  {/* Delete request */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRequestToDelete(request)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('Are you sure?', 'هل أنت متأكد؟')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t(
                            'This action cannot be undone. This will permanently delete the password reset request.',
                            'لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف طلب إعادة تعيين كلمة المرور بشكل دائم.'
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRequestToDelete(null)}>
                          {t('Cancel', 'إلغاء')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteRequest}
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={isDeleting}
                        >
                          {isDeleting ? t('Deleting...', 'جاري الحذف...') : t('Delete', 'حذف')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Reset password */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setNewPassword('');
                        }}
                      >
                        <Key className="w-4 h-4 me-2" />
                        {t('Reset Password', 'إعادة تعيين')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('Reset Employee Password', 'إعادة تعيين كلمة مرور الموظف')}</DialogTitle>
                        <DialogDescription>
                          {t('Enter a new password for', 'أدخل كلمة مرور جديدة لـ')}{' '}
                          <strong>{t(request.employee_name, request.employee_name_ar || request.employee_name)}</strong>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">{t('New Password', 'كلمة المرور الجديدة')}</Label>
                          <Input
                            id="newPassword"
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t('Enter new password', 'أدخل كلمة المرور الجديدة')}
                            className="h-11"
                            disabled={isResetting}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('Minimum 6 characters. Employee will be notified.', 'الحد الأدنى 6 أحرف. سيتم إخطار الموظف.')}
                          </p>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => { setSelectedRequest(null); setNewPassword(''); }}
                            disabled={isResetting}
                          >
                            {t('Cancel', 'إلغاء')}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={isResetting || !newPassword}
                          >
                            {isResetting
                              ? t('Resetting...', 'جاري إعادة التعيين...')
                              : t('Reset Password', 'إعادة تعيين كلمة المرور')
                            }
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                </div>{/* end buttons */}
              </div>/* end item row */
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
