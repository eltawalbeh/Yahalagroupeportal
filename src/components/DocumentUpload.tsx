import React, { useState } from 'react';
import { Upload, X, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DocumentUploadProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Employment Contract', labelAr: 'عقد العمل' },
  { value: 'id', label: 'National ID', labelAr: 'الهوية الوطنية' },
  { value: 'passport', label: 'Passport', labelAr: 'جواز السفر' },
  { value: 'certificate', label: 'Certificate', labelAr: 'شهادة' },
  { value: 'medical', label: 'Medical Report', labelAr: 'تقرير طبي' },
  { value: 'visa', label: 'Visa', labelAr: 'تأشيرة' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' }
];

export function DocumentUpload({ open, onClose, employeeId, onSuccess }: DocumentUploadProps) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('contract');
  const [documentName, setDocumentName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error(t('File size must be less than 10MB', 'حجم الملف يجب أن يكون أقل من 10 ميجابايت'));
        return;
      }
      
      setFile(selectedFile);
      
      // Auto-fill document name from file name if empty
      if (!documentName) {
        setDocumentName(selectedFile.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error(t('Please select a file', 'الرجاء اختيار ملف'));
      return;
    }

    if (!documentName.trim()) {
      toast.error(t('Please enter document name', 'الرجاء إدخال اسم الوثيقة'));
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee_id', employeeId);
      formData.append('document_type', documentType);
      formData.append('document_name', documentName);
      formData.append('expiry_date', expiryDate);
      formData.append('notes', notes);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/documents/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(t('Document uploaded successfully', 'تم رفع الوثيقة بنجاح'));
        onSuccess();
        resetForm();
        onClose();
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error(t('Failed to upload document', 'فشل رفع الوثيقة'));
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setDocumentType('contract');
    setDocumentName('');
    setExpiryDate('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {t('Upload Document', 'رفع وثيقة')}
          </DialogTitle>
          <DialogDescription>
            {t('Upload employee documents for record keeping', 'رفع وثائق الموظف لحفظ السجلات')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label>{t('Document Type', 'نوع الوثيقة')}</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(type.label, type.labelAr)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label>{t('Document Name', 'اسم الوثيقة')}</Label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder={t('e.g., Employment Contract 2025', 'مثال: عقد العمل 2025')}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>{t('Select File', 'اختيار الملف')}</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t('Click to upload or drag and drop', 'انقر للرفع أو اسحب وأفلت')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('PDF, DOC, DOCX, JPG, PNG (max 10MB)', 'PDF, DOC, DOCX, JPG, PNG (حد أقصى 10 ميجابايت)')}
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Expiry Date (Optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('Expiry Date (Optional)', 'تاريخ الانتهاء (اختياري)')}
            </Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            {expiryDate && new Date(expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  {t('Document expires within 30 days', 'تنتهي الوثيقة خلال 30 يومًا')}
                </p>
              </div>
            )}
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label>{t('Notes (Optional)', 'ملاحظات (اختياري)')}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('Additional information', 'معلومات إضافية')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            {t('Cancel', 'إلغاء')}
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Upload className="w-4 h-4 me-2 animate-spin" />
                {t('Uploading...', 'جاري الرفع...')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 me-2" />
                {t('Upload', 'رفع')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
