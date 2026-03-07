import React, { useRef, useState, useEffect } from 'react';
import { Pen, RotateCcw, Download, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

interface DocumentSignatureProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  onSignatureComplete: (signature: string) => void;
}

export function DocumentSignature({ open, onClose, documentId, documentName, onSignatureComplete }: DocumentSignatureProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Set drawing style
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [open]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      toast.error(t('Please provide a signature', 'الرجاء التوقيع'));
      return;
    }

    // Convert canvas to base64 image
    const signatureData = canvas.toDataURL('image/png');
    
    onSignatureComplete(signatureData);
    toast.success(t('Signature saved successfully', 'تم حفظ التوقيع بنجاح'));
    clearSignature();
    onClose();
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const link = document.createElement('a');
    link.download = `signature_${documentId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5" />
            {t('Digital Signature', 'التوقيع الرقمي')}
          </DialogTitle>
          <DialogDescription>
            {t('Sign the document:', 'التوقيع على الوثيقة:')} {documentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signature Canvas */}
          <div className="border-2 border-dashed rounded-lg p-4 bg-white dark:bg-gray-900">
            <canvas
              ref={canvasRef}
              className="w-full h-64 cursor-crosshair bg-white dark:bg-gray-900 rounded"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Instructions */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Pen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              {t(
                'Draw your signature using your mouse or touchscreen',
                'ارسم توقيعك باستخدام الماوس أو شاشة اللمس'
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSignature}
              disabled={!hasSignature}
            >
              <RotateCcw className="w-4 h-4 me-2" />
              {t('Clear', 'مسح')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSignature}
              disabled={!hasSignature}
            >
              <Download className="w-4 h-4 me-2" />
              {t('Download', 'تحميل')}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel', 'إلغاء')}
          </Button>
          <Button onClick={saveSignature} disabled={!hasSignature}>
            <Check className="w-4 h-4 me-2" />
            {t('Save Signature', 'حفظ التوقيع')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
