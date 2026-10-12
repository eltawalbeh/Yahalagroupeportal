import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BreadcrumbItem {
  label: string;
  labelAr: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { t } = useLanguage();

  return (
    <nav className="flex items-center gap-2 text-sm mb-4" aria-label="Breadcrumb">
      <button
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-4 h-4" />
      </button>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          {index === items.length - 1 ? (
            <span className="text-foreground font-medium">
              {t(item.label, item.labelAr)}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(item.label, item.labelAr)}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
