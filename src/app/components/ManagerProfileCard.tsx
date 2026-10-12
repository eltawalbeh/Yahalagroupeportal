import React from 'react';
import { User, Phone, CreditCard } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';

export function ManagerProfileCard() {
  const { t } = useLanguage();
  const { employee } = useAuth();

  if (!employee) return null;

  return (
    <Card className="bg-card rounded-xl shadow-sm p-6 mb-6 border-border/50">
      {/* Header: Avatar + Name + Position */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 border border-green-100 dark:border-green-900">
          {employee.photo_url ? (
            <img 
              src={employee.photo_url} 
              alt={employee.full_name} 
              className="w-full h-full object-cover rounded-full" 
            />
          ) : (
            <User className="w-8 h-8 text-green-600 dark:text-green-400" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">
            {t(employee.full_name, employee.full_name_ar || employee.full_name)}
          </h3>
          <p className="text-muted-foreground">
            {t(employee.position || '', employee.position_ar || employee.position || '')}
          </p>
        </div>
      </div>

      <div className="h-px bg-border/50 w-full mb-6" />

      {/* Footer: ID + Mobile */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-0.5">
              {t('Employee ID', 'رقم الموظف')}
            </p>
            <p className="font-medium text-foreground leading-none">
              {employee.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-0.5">
              {t('Mobile', 'الجوال')}
            </p>
            <p className="font-medium text-foreground leading-none" dir="ltr">
              {employee.phone || '-'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
