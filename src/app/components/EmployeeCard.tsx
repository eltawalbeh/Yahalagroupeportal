import React, { useState, useEffect } from 'react';
import { User, Phone, Calendar, Briefcase, CreditCard, Building2, IdCard, History, UserCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { adminFetch } from '../utils/adminApi';

interface EmployeeCardProps {
  onViewHistory?: () => void;
}

export function EmployeeCard({ onViewHistory }: EmployeeCardProps = {}) {
  const { t } = useLanguage();
  const { employee, company } = useAuth();
  const [manager, setManager] = useState<any>(null);

  useEffect(() => {
    if (employee?.manager_id) {
      fetchManager();
    }
  }, [employee?.manager_id]);

  const fetchManager = async () => {
    try {
      const response = await adminFetch('/admin/employees');
      const data = await response.json();
      if (data.success) {
        const managerData = data.employees.find((emp: any) => emp.id === employee?.manager_id);
        setManager(managerData);
      }
    } catch (error) {
      console.error('Error fetching manager:', error);
    }
  };

  if (!employee) return null;

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    labelAr, 
    value 
  }: { 
    icon: React.ElementType; 
    label: string; 
    labelAr: string; 
    value: string | number | undefined;
  }) => {
    if (!value) return null;
    
    return (
      <div className="flex items-start gap-2 sm:gap-3 py-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground">{t(label, labelAr)}</p>
          <p className="text-sm sm:text-base break-words">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-xl p-5 sm:p-6 border border-border/50">
      {/* Header with logo and photo */}
      <div className="flex items-start justify-between mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-border">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 me-2">
          {/* Employee photo */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary-teal/20 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/10">
            {employee.photo_url ? (
              <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            )}
          </div>
          
          {/* Name and position */}
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg truncate">
              {t(employee.full_name, employee.full_name_ar || employee.full_name)}
            </h3>
            {employee.position && (
              <p className="text-sm text-muted-foreground truncate">
                {t(employee.position, employee.position_ar || employee.position)}
              </p>
            )}
          </div>
        </div>

        {/* Company logo */}
        {company?.logo_url && (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain p-2" />
          </div>
        )}
      </div>

      {/* Employee details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6">
        <InfoRow 
          icon={IdCard}
          label="Employee ID"
          labelAr="رقم الموظف"
          value={employee.id}
        />
        
        <InfoRow 
          icon={IdCard}
          label="Iqama/ID"
          labelAr="الإقامة/الهوية"
          value={employee.iqama}
        />
        
        <InfoRow 
          icon={Phone}
          label="Mobile"
          labelAr="الجوال"
          value={employee.phone}
        />
        
        <InfoRow 
          icon={Calendar}
          label="Date of Birth"
          labelAr="تاريخ الميلاد"
          value={employee.date_of_birth}
        />
        
        <InfoRow 
          icon={CreditCard}
          label="IBAN"
          labelAr="الآيبان"
          value={employee.iban}
        />
        
        <InfoRow 
          icon={Building2}
          label="Bank"
          labelAr="البنك"
          value={employee.bank_name}
        />
        
        {manager && (
          <InfoRow 
            icon={UserCheck}
            label="Manager"
            labelAr="مدير"
            value={t(manager.full_name, manager.full_name_ar || manager.full_name)}
          />
        )}
      </div>

      {/* View History Button */}
      {onViewHistory && (
        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewHistory}
            className="text-sm hover:bg-primary/10 hover:text-primary"
          >
            <History className="w-4 h-4 me-2" />
            {t('View History', 'عرض السجل')}
          </Button>
        </div>
      )}
    </div>
  );
}