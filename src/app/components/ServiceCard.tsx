import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  titleAr: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

export function ServiceCard({ 
  icon: Icon, 
  title, 
  titleAr, 
  color, 
  isSelected, 
  onClick 
}: ServiceCardProps) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full p-5 sm:p-6 rounded-2xl transition-all duration-300
        border-2 text-start
        ${isSelected 
          ? 'border-white shadow-2xl scale-[1.02] sm:scale-105' 
          : 'border-transparent hover:border-white/50 hover:shadow-xl active:scale-[0.98]'
        }
      `}
      style={{ backgroundColor: color }}
    >
      {/* Radio indicator */}
      <div className="absolute top-3 sm:top-4 end-3 sm:end-4">
        <div className={`
          w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white
          flex items-center justify-center transition-all
          ${isSelected ? 'bg-white' : 'bg-transparent'}
        `}>
          {isSelected && (
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: color }} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="p-2.5 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl text-white pe-6">
          {t(title, titleAr)}
        </h3>
      </div>
    </button>
  );
}
