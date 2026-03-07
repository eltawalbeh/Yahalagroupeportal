import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, X, Clock, CheckCircle, XCircle, Calendar, DollarSign, LogOut as ExitIcon, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { RequestComments } from '../components/RequestComments';
import { RequestActivityLog } from '../components/RequestActivityLog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RequestHistoryProps {
  onBack: () => void;
}

interface Request {
  id: string;
  type: string;
  sub_type: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes?: string;
  admin_notes?: string;
  amount?: number;
  activity_log?: any[];
}

export function RequestHistory({ onBack }: RequestHistoryProps) {
  const { t } = useLanguage();
  const { employee } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [employee?.id]);

  useEffect(() => {
    applyFilters();
  }, [requests, filterType, filterStatus]);

  // Auto-refresh every 30 seconds to catch new updates
  useEffect(() => {
    if (employee?.id) {
      const interval = setInterval(fetchRequests, 180000); // 3 minutes instead of 30 seconds
      return () => clearInterval(interval);
    }
  }, [employee?.id]);

  const fetchRequests = async () => {
    if (!employee?.id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/employee/${employee.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error(t('Failed to load requests', 'فشل تحميل الطلبات'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredRequests(filtered);
  };

  const handleCancelRequest = async () => {
    if (!cancellingId) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/${cancellingId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(t('Request cancelled successfully', 'تم إلغاء الطلب بنجاح'));
        fetchRequests();
        setShowCancelDialog(false);
        setCancellingId(null);
      } else {
        throw new Error('Failed to cancel');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error(t('Failed to cancel request', 'فشل إلغاء الطلب'));
    }
  };

  const downloadPDF = (request: Request) => {
    // Create simple text content for download
    const content = generateRequestText(request);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request_${request.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateRequestText = (request: Request) => {
    const typeLabels: any = {
      leave: { en: 'Leave Request', ar: 'طلب إجازة' },
      advance: { en: 'Advance Request', ar: 'طلب سلفة' },
      entry: { en: 'Entry Permission', ar: 'خروج وعودة' }
    };

    return `
${t('Request Details', 'تفاصيل الطلب')}
${'='.repeat(50)}

${t('Request ID', 'رقم الطلب')}: ${request.id}
${t('Type', 'النوع')}: ${t(typeLabels[request.type]?.en || request.type, typeLabels[request.type]?.ar || request.type)}
${t('Status', 'الحالة')}: ${t(request.status, request.status === 'approved' ? 'موافق عليه' : request.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة')}
${t('Submitted', 'تاريخ التقديم')}: ${new Date(request.created_at).toLocaleDateString()}

${request.start_date ? `${t('Start Date', 'تاريخ البدء')}: ${request.start_date}` : ''}
${request.end_date ? `${t('End Date', 'تاريخ الانتهاء')}: ${request.end_date}` : ''}
${request.start_time ? `${t('Start Time', 'وقت البدء')}: ${request.start_time}` : ''}
${request.end_time ? `${t('End Time', 'وقت الانتهاء')}: ${request.end_time}` : ''}
${request.amount ? `${t('Amount', 'المبلغ')}: ${request.amount} SAR` : ''}
${request.notes ? `${t('Notes', 'ملاحظات')}: ${request.notes}` : ''}
${request.admin_notes ? `${t('Admin Notes', 'ملاحظات المسؤول')}: ${request.admin_notes}` : ''}

${'='.repeat(50)}
${t('Ya Hala Group E-Portal', 'بوابة مجموعة يا هلا الإلكترونية')}
    `.trim();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'default',
      approved: 'default',
      rejected: 'destructive'
    };

    const colors: any = {
      pending: 'bg-status-pending-bg text-status-pending-fg',
      approved: 'bg-status-approved-bg text-status-approved-fg',
      rejected: 'bg-status-rejected-bg text-status-rejected-fg'
    };

    return (
      <Badge className={`${colors[status]} flex items-center gap-1`}>
        {getStatusIcon(status)}
        {t(
          status.charAt(0).toUpperCase() + status.slice(1),
          status === 'approved' ? 'موافق عليه' : status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'
        )}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leave':
        return <Calendar className="w-5 h-5 text-service-leave" />;
      case 'advance':
        return <DollarSign className="w-5 h-5 text-service-advance" />;
      case 'entry':
        return <ExitIcon className="w-5 h-5 text-service-entry" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string, subType?: string) => {
    const types: any = {
      leave: { en: 'Leave Request', ar: 'طلب إجازة' },
      advance: { en: 'Advance Request', ar: 'طلب سلفة' },
      entry: { en: 'Entry Permission', ar: 'خروج وعودة' }
    };

    return t(types[type]?.en || type, types[type]?.ar || type);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={onBack} className="-ms-2">
              <ArrowLeft className="w-4 h-4 me-2" />
              {t('Back', 'رجوع')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
              {t('Refresh', 'تحديث')}
            </Button>
          </div>
          <h1 className="text-xl sm:text-2xl mb-2">
            {t('Request History', 'سجل الطلبات')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('View and manage all your requests', 'عرض وإدارة جميع طلباتك')}
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm">{t('Filter by Type', 'تصفية حسب النوع')}</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Types', 'جميع الأنواع')}</SelectItem>
                  <SelectItem value="leave">{t('Leave', 'إجازة')}</SelectItem>
                  <SelectItem value="advance">{t('Advance', 'سلفة')}</SelectItem>
                  <SelectItem value="entry">{t('Entry Permission', 'خروج وعودة')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm">{t('Filter by Status', 'تصفية حسب الحالة')}</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Status', 'جميع الحالات')}</SelectItem>
                  <SelectItem value="pending">{t('Pending', 'قيد المراجعة')}</SelectItem>
                  <SelectItem value="approved">{t('Approved', 'موافق عليه')}</SelectItem>
                  <SelectItem value="rejected">{t('Rejected', 'مرفوض')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('Loading...', 'جاري التحميل...')}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t('No requests found', 'لا توجد طلبات')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left: Request Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(request.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base">{getTypeLabel(request.type, request.sub_type)}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{t('Submitted', 'تاريخ التقديم')}: {new Date(request.created_at).toLocaleDateString()}</p>
                        {request.start_date && (
                          <p>
                            {t('Period', 'الفترة')}: {request.start_date}
                            {request.end_date && request.end_date !== request.start_date && ` - ${request.end_date}`}
                          </p>
                        )}
                        {request.amount && (
                          <p>{t('Amount', 'المبلغ')}: {request.amount} {t('SAR', 'ر.س')}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      {t('Details', 'التفاصيل')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadPDF(request)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCancellingId(request.id);
                          setShowCancelDialog(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('Request Details', 'تفاصيل الطلب')}</DialogTitle>
              <DialogDescription>
                {t('View details of your request', 'عرض تفاصيل طلبك')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-6 py-4">
              {/* Left Column - Request Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('Status', 'الحالة')}</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('Type', 'النوع')}</span>
                  <p>{getTypeLabel(selectedRequest.type, selectedRequest.sub_type)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('Submitted', 'تاريخ التقديم')}</span>
                  <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                {selectedRequest.start_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('Start Date', 'تاريخ البدء')}</span>
                    <p>{selectedRequest.start_date}</p>
                  </div>
                )}
                {selectedRequest.end_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('End Date', 'تاريخ الانتهاء')}</span>
                    <p>{selectedRequest.end_date}</p>
                  </div>
                )}
                {selectedRequest.start_time && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('Start Time', 'وقت البدء')}</span>
                    <p>{selectedRequest.start_time}</p>
                  </div>
                )}
                {selectedRequest.end_time && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('End Time', 'وقت الانتهاء')}</span>
                    <p>{selectedRequest.end_time}</p>
                  </div>
                )}
                {selectedRequest.amount && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('Amount', 'المبلغ')}</span>
                    <p>{selectedRequest.amount} {t('SAR', 'ر.س')}</p>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('Notes', 'ملاحظات')}</span>
                    <p>{selectedRequest.notes}</p>
                  </div>
                )}
                {selectedRequest.admin_notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('Admin Notes', 'ملاحظات المسؤول')}</span>
                    <p>{selectedRequest.admin_notes}</p>
                  </div>
                )}

                {/* Activity Log */}
                <div className="border-t pt-4 mt-2">
                  <RequestActivityLog activityLog={(selectedRequest as any).activity_log} compact />
                </div>

                <DialogFooter className="mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    {t('Close', 'إغلاق')}
                  </Button>
                </DialogFooter>
              </div>

              {/* Right Column - Comments */}
              <div className="border-l border-border pl-6">
                {employee && (
                  <RequestComments
                    requestId={selectedRequest.id}
                    currentUserId={employee.id}
                    currentUserName={employee.full_name}
                    currentUserRole="employee"
                    onCommentAdded={() => {
                      // Optionally refresh requests to see comment count updates
                      fetchRequests();
                    }}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Cancel Request', 'إلغاء الطلب')}</DialogTitle>
            <DialogDescription>
              {t(
                'Are you sure you want to cancel this request? This action cannot be undone.',
                'هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {t('No, Keep it', 'لا، احتفظ به')}
            </Button>
            <Button variant="destructive" onClick={handleCancelRequest}>
              {t('Yes, Cancel', 'نعم، إلغاء')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}