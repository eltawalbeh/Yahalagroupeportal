import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, AlertCircle, Calendar, Eye, Edit, FileSignature } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { DocumentUpload } from './DocumentUpload';
import { DocumentSignature } from './DocumentSignature';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Document {
  id: string;
  employee_id: string;
  employee_name?: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number;
  expiry_date?: string;
  notes?: string;
  signature?: string;
  created_at: string;
  uploaded_by?: string;
}

interface DocumentManagementProps {
  employeeId?: string; // If provided, show documents for specific employee only
}

export function DocumentManagement({ employeeId }: DocumentManagementProps) {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, expiring, expired

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  useEffect(() => {
    applyFilters();
  }, [documents, searchQuery, filterType, filterStatus]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const url = employeeId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/documents/employee/${employeeId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/documents`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        // Set empty array instead of showing error
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents (non-critical):', error);
      // Set empty array instead of showing error toast
      setDocuments([]);
      // Only show error if it's not a network issue
      if (error instanceof Error && !error.message.includes('fetch')) {
        toast.error(t('Failed to load documents', 'فشل تحميل الوثائق'));
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.document_name.toLowerCase().includes(query) ||
        doc.employee_name?.toLowerCase().includes(query) ||
        doc.notes?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === filterType);
    }

    // Status filter (expiry)
    if (filterStatus !== 'all') {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(doc => {
        if (!doc.expiry_date) return false;
        const expiryDate = new Date(doc.expiry_date);

        if (filterStatus === 'expired') {
          return expiryDate < now;
        } else if (filterStatus === 'expiring') {
          return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
        }
        return true;
      });
    }

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredDocuments(filtered);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/documents/${deletingId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(t('Document deleted successfully', 'تم حذف الوثيقة بنجاح'));
        fetchDocuments();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(t('Failed to delete document', 'فشل حذف الوثيقة'));
    } finally {
      setShowDeleteDialog(false);
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.document_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error(t('Failed to download document', 'فشل تحميل الوثيقة'));
    }
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!selectedDocument) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/documents/${selectedDocument.id}/signature`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ signature: signatureData })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(t('Signature added successfully', 'تم إضافة التوقيع بنجاح'));
        fetchDocuments();
        setSelectedDocument(null);
      } else {
        throw new Error('Signature save failed');
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error(t('Failed to save signature', 'فشل حفظ التوقيع'));
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;

    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', variant: 'destructive', text: t('Expired', 'منتهية') };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', variant: 'warning', text: t(`Expires in ${daysUntilExpiry} days`, `تنتهي خلال ${daysUntilExpiry} يوم`) };
    }
    return { status: 'valid', variant: 'default', text: t('Valid', 'صالحة') };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getTypeLabel = (type: string) => {
    const types: any = {
      contract: { en: 'Employment Contract', ar: 'عقد العمل' },
      id: { en: 'National ID', ar: 'الهوية الوطنية' },
      passport: { en: 'Passport', ar: 'جواز السفر' },
      certificate: { en: 'Certificate', ar: 'شهادة' },
      medical: { en: 'Medical Report', ar: 'تقرير طبي' },
      visa: { en: 'Visa', ar: 'تأشيرة' },
      other: { en: 'Other', ar: 'أخرى' }
    };
    return t(types[type]?.en || type, types[type]?.ar || type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl mb-1">
            {t('Document Management', 'إدارة الوثائق')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('Upload and manage employee documents', 'رفع وإدارة وثائق الموظفين')}
          </p>
        </div>
        {employeeId && (
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 me-2" />
            {t('Upload Document', 'رفع وثيقة')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm">{t('Search', 'بحث')}</label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search documents...', 'البحث عن وثائق...')}
            />
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm">{t('Document Type', 'نوع الوثيقة')}</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Types', 'جميع الأنواع')}</SelectItem>
                <SelectItem value="contract">{t('Contract', 'عقد')}</SelectItem>
                <SelectItem value="id">{t('ID', 'هوية')}</SelectItem>
                <SelectItem value="passport">{t('Passport', 'جواز سفر')}</SelectItem>
                <SelectItem value="certificate">{t('Certificate', 'شهادة')}</SelectItem>
                <SelectItem value="medical">{t('Medical', 'طبي')}</SelectItem>
                <SelectItem value="visa">{t('Visa', 'تأشيرة')}</SelectItem>
                <SelectItem value="other">{t('Other', 'أخرى')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm">{t('Expiry Status', 'حالة الانتهاء')}</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Status', 'جميع الحالات')}</SelectItem>
                <SelectItem value="expiring">{t('Expiring Soon', 'تنتهي قريبًا')}</SelectItem>
                <SelectItem value="expired">{t('Expired', 'منتهية')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('Loading documents...', 'جاري تحميل الوثائق...')}</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all'
              ? t('No documents match your filters', 'لا توجد وثائق مطابقة للفلاتر')
              : t('No documents uploaded yet', 'لم يتم رفع أي وثائق بعد')
            }
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiry_date);
            
            return (
              <Card key={doc.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm truncate" title={doc.document_name}>
                          {doc.document_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {getTypeLabel(doc.document_type)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Employee Name (if not in employee view) */}
                  {!employeeId && doc.employee_name && (
                    <div className="text-xs text-muted-foreground">
                      {t('Employee:', 'الموظف:')} {doc.employee_name}
                    </div>
                  )}

                  {/* File Info */}
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </div>

                  {/* Expiry Status */}
                  {expiryStatus && (
                    <Badge
                      variant={expiryStatus.status === 'expired' ? 'destructive' : 'default'}
                      className={expiryStatus.status === 'expiring' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : ''}
                    >
                      <AlertCircle className="w-3 h-3 me-1" />
                      {expiryStatus.text}
                    </Badge>
                  )}

                  {/* Signature Status */}
                  {doc.signature && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900/50">
                      <FileSignature className="w-3 h-3 me-1" />
                      {t('Signed', 'موقعة')}
                    </Badge>
                  )}

                  {/* Notes */}
                  {doc.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {doc.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 me-1" />
                      {t('Download', 'تحميل')}
                    </Button>
                    {!doc.signature && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowSignatureModal(true);
                        }}
                      >
                        <FileSignature className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingId(doc.id);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {employeeId && (
        <DocumentUpload
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          employeeId={employeeId}
          onSuccess={fetchDocuments}
        />
      )}

      {/* Signature Modal */}
      {selectedDocument && (
        <DocumentSignature
          open={showSignatureModal}
          onClose={() => {
            setShowSignatureModal(false);
            setSelectedDocument(null);
          }}
          documentId={selectedDocument.id}
          documentName={selectedDocument.document_name}
          onSignatureComplete={handleSignatureComplete}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Document', 'حذف الوثيقة')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Are you sure you want to delete this document? This action cannot be undone.',
                'هل أنت متأكد من حذف هذه الوثيقة؟ لا يمكن التراجع عن هذا الإجراء.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'إلغاء')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('Delete', 'حذف')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
