import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Save, Star, StarOff, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

export interface FilterCriteria {
  searchQuery: string;
  types: string[];
  statuses: string[];
  companies: string[];
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria;
  isFavorite: boolean;
}

interface AdvancedSearchFilterProps {
  criteria: FilterCriteria;
  onCriteriaChange: (criteria: FilterCriteria) => void;
  companies?: Array<{ id: number; name: string }>;
  showAdvanced?: boolean;
}

const DEFAULT_CRITERIA: FilterCriteria = {
  searchQuery: '',
  types: [],
  statuses: [],
  companies: [],
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: ''
};

export function AdvancedSearchFilter({ 
  criteria, 
  onCriteriaChange, 
  companies = [],
  showAdvanced = true 
}: AdvancedSearchFilterProps) {
  const { t } = useLanguage();
  const [showFilters, setShowFilters] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Load presets from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('filter_presets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error('Error loading presets:', e);
      }
    }
  }, []);

  // Save presets to localStorage
  const savePresetsToStorage = (newPresets: FilterPreset[]) => {
    localStorage.setItem('filter_presets', JSON.stringify(newPresets));
    setPresets(newPresets);
  };

  const handleSearchChange = (value: string) => {
    onCriteriaChange({ ...criteria, searchQuery: value });
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = criteria.types.includes(type)
      ? criteria.types.filter(t => t !== type)
      : [...criteria.types, type];
    onCriteriaChange({ ...criteria, types: newTypes });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = criteria.statuses.includes(status)
      ? criteria.statuses.filter(s => s !== status)
      : [...criteria.statuses, status];
    onCriteriaChange({ ...criteria, statuses: newStatuses });
  };

  const handleCompanyToggle = (companyId: string) => {
    const newCompanies = criteria.companies.includes(companyId)
      ? criteria.companies.filter(c => c !== companyId)
      : [...criteria.companies, companyId];
    onCriteriaChange({ ...criteria, companies: newCompanies });
  };

  const clearAllFilters = () => {
    onCriteriaChange(DEFAULT_CRITERIA);
    setSelectedPresetId(null);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (criteria.searchQuery) count++;
    if (criteria.types.length > 0) count++;
    if (criteria.statuses.length > 0) count++;
    if (criteria.companies.length > 0) count++;
    if (criteria.dateFrom || criteria.dateTo) count++;
    if (criteria.amountMin || criteria.amountMax) count++;
    return count;
  };

  const savePreset = () => {
    if (!presetName.trim()) {
      toast.error(t('Please enter a preset name', 'الرجاء إدخال اسم الفلتر'));
      return;
    }

    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name: presetName,
      criteria: { ...criteria },
      isFavorite: false
    };

    const newPresets = [...presets, newPreset];
    savePresetsToStorage(newPresets);
    toast.success(t('Filter preset saved', 'تم حفظ الفلتر'));
    setShowSavePresetDialog(false);
    setPresetName('');
  };

  const loadPreset = (preset: FilterPreset) => {
    onCriteriaChange(preset.criteria);
    setSelectedPresetId(preset.id);
    toast.success(t('Filter preset loaded', 'تم تحميل الفلتر'));
  };

  const deletePreset = (presetId: string) => {
    const newPresets = presets.filter(p => p.id !== presetId);
    savePresetsToStorage(newPresets);
    if (selectedPresetId === presetId) {
      setSelectedPresetId(null);
    }
    toast.success(t('Filter preset deleted', 'تم حذف الفلتر'));
  };

  const toggleFavorite = (presetId: string) => {
    const newPresets = presets.map(p => 
      p.id === presetId ? { ...p, isFavorite: !p.isFavorite } : p
    );
    savePresetsToStorage(newPresets);
  };

  const activeFilterCount = getActiveFilterCount();
  const favoritePresets = presets.filter(p => p.isFavorite);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={criteria.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('Search by name, ID, amount, notes...', 'البحث بالاسم، الرقم، المبلغ، الملاحظات...')}
            className="pl-10"
          />
          {criteria.searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {showAdvanced && (
          <>
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {t('Filters', 'الفلاتر')}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{t('Advanced Filters', 'الفلاتر المتقدمة')}</h4>
                    {activeFilterCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearAllFilters}
                        className="h-auto p-1 text-xs"
                      >
                        {t('Clear all', 'مسح الكل')}
                      </Button>
                    )}
                  </div>

                  {/* Request Types */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('Request Types', 'أنواع الطلبات')}</Label>
                    <div className="space-y-2">
                      {['leave', 'advance', 'entry'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={criteria.types.includes(type)}
                            onCheckedChange={() => handleTypeToggle(type)}
                          />
                          <label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                            {t(
                              type === 'leave' ? 'Leave Request' : type === 'advance' ? 'Advance Request' : 'Entry Permission',
                              type === 'leave' ? 'طلب إجازة' : type === 'advance' ? 'طلب سلفة' : 'تصريح خروج وعودة'
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statuses */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('Status', 'الحالة')}</Label>
                    <div className="space-y-2">
                      {['pending', 'approved', 'rejected'].map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={criteria.statuses.includes(status)}
                            onCheckedChange={() => handleStatusToggle(status)}
                          />
                          <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                            {t(
                              status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected',
                              status === 'pending' ? 'قيد المراجعة' : status === 'approved' ? 'موافق عليه' : 'مرفوض'
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Companies */}
                  {companies.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('Companies', 'الشركات')}</Label>
                      <div className="space-y-2">
                        {companies.map(company => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`company-${company.id}`}
                              checked={criteria.companies.includes(company.id.toString())}
                              onCheckedChange={() => handleCompanyToggle(company.id.toString())}
                            />
                            <label htmlFor={`company-${company.id}`} className="text-sm cursor-pointer">
                              {company.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('Date Range', 'نطاق التاريخ')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('From', 'من')}</Label>
                        <Input
                          type="date"
                          value={criteria.dateFrom}
                          onChange={(e) => onCriteriaChange({ ...criteria, dateFrom: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('To', 'إلى')}</Label>
                        <Input
                          type="date"
                          value={criteria.dateTo}
                          onChange={(e) => onCriteriaChange({ ...criteria, dateTo: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount Range */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('Amount Range (SAR)', 'نطاق المبلغ (ر.س)')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('Min', 'الحد الأدنى')}</Label>
                        <Input
                          type="number"
                          value={criteria.amountMin}
                          onChange={(e) => onCriteriaChange({ ...criteria, amountMin: e.target.value })}
                          placeholder="0"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('Max', 'الحد الأقصى')}</Label>
                        <Input
                          type="number"
                          value={criteria.amountMax}
                          onChange={(e) => onCriteriaChange({ ...criteria, amountMax: e.target.value })}
                          placeholder="10000"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Preset Button */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowSavePresetDialog(true)}
                    disabled={activeFilterCount === 0}
                  >
                    <Save className="w-4 h-4" />
                    {t('Save Filter Preset', 'حفظ الفلتر')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Presets Dropdown */}
            {presets.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Star className="w-4 h-4" />
                    {t('Presets', 'الفلاتر المحفوظة')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-2">
                    <h4 className="font-semibold mb-3">{t('Saved Filter Presets', 'الفلاتر المحفوظة')}</h4>
                    {presets.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t('No saved presets', 'لا توجد فلاتر محفوظة')}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {presets.map(preset => (
                          <div
                            key={preset.id}
                            className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer ${
                              selectedPresetId === preset.id ? 'bg-muted' : ''
                            }`}
                          >
                            <div 
                              className="flex-1 flex items-center gap-2"
                              onClick={() => loadPreset(preset)}
                            >
                              {preset.isFavorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                              <span className="text-sm">{preset.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(preset.id);
                                }}
                              >
                                {preset.isFavorite ? (
                                  <StarOff className="w-3 h-3" />
                                ) : (
                                  <Star className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePreset(preset.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </>
        )}
      </div>

      {/* Active Filters Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {criteria.types.map(type => (
            <Badge key={type} variant="secondary" className="gap-1">
              {t(
                type === 'leave' ? 'Leave' : type === 'advance' ? 'Advance' : 'Entry',
                type === 'leave' ? 'إجازة' : type === 'advance' ? 'سلفة' : 'خروج'
              )}
              <button onClick={() => handleTypeToggle(type)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {criteria.statuses.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {t(
                status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected',
                status === 'pending' ? 'قيد المراجعة' : status === 'approved' ? 'موافق' : 'مرفوض'
              )}
              <button onClick={() => handleStatusToggle(status)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {criteria.companies.map(companyId => {
            const company = companies.find(c => c.id.toString() === companyId);
            return company ? (
              <Badge key={companyId} variant="secondary" className="gap-1">
                {company.name}
                <button onClick={() => handleCompanyToggle(companyId)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {(criteria.dateFrom || criteria.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              {criteria.dateFrom && criteria.dateTo
                ? `${criteria.dateFrom} - ${criteria.dateTo}`
                : criteria.dateFrom
                ? `From ${criteria.dateFrom}`
                : `Until ${criteria.dateTo}`}
              <button onClick={() => onCriteriaChange({ ...criteria, dateFrom: '', dateTo: '' })}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(criteria.amountMin || criteria.amountMax) && (
            <Badge variant="secondary" className="gap-1">
              {criteria.amountMin && criteria.amountMax
                ? `${criteria.amountMin}-${criteria.amountMax} SAR`
                : criteria.amountMin
                ? `Min ${criteria.amountMin} SAR`
                : `Max ${criteria.amountMax} SAR`}
              <button onClick={() => onCriteriaChange({ ...criteria, amountMin: '', amountMax: '' })}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Favorite Presets Quick Access */}
      {favoritePresets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground flex items-center">
            <Star className="w-3 h-3 me-1 fill-yellow-400 text-yellow-400" />
            {t('Quick Filters:', 'فلاتر سريعة:')}
          </span>
          {favoritePresets.map(preset => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => loadPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Save Filter Preset', 'حفظ الفلتر')}</DialogTitle>
            <DialogDescription>
              {t('Give this filter configuration a name for quick access later', 'أعط هذا الفلتر اسمًا للوصول السريع لاحقًا')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('Preset Name', 'اسم الفلتر')}</Label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('e.g., Pending Leave Requests', 'مثال: طلبات الإجازة المعلقة')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavePresetDialog(false)}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button onClick={savePreset}>
              <Save className="w-4 h-4 me-2" />
              {t('Save', 'حفظ')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
