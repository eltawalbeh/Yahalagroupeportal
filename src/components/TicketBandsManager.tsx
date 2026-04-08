import React, { useState, useEffect } from 'react';
import {
  Plane, Plus, Trash2, Edit3, Save, X, RefreshCw, Users, Mail, Phone,
  AlertCircle, MapPin, DollarSign, Shield, Settings2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { adminFetch } from '../utils/adminApi';

interface TicketBand {
  id: string;
  destination: string;
  destination_ar: string;
  country: string;
  country_ar: string;
  min_sar: number;
  max_sar: number;
}

interface OpsMember {
  id: string;
  name: string;
  name_ar: string;
  email: string;
  phone: string;
}

export function TicketBandsManager() {
  const { t, language } = useLanguage();

  // Bands state
  const [bands, setBands] = useState<TicketBand[]>([]);
  const [loadingBands, setLoadingBands] = useState(true);
  const [editingBand, setEditingBand] = useState<TicketBand | null>(null);
  const [showAddBand, setShowAddBand] = useState(false);
  const [savingBand, setSavingBand] = useState(false);
  const [newBand, setNewBand] = useState({ destination: '', destination_ar: '', country: '', country_ar: '', min_sar: 1500, max_sar: 0 });

  // Operations team state
  const [opsMembers, setOpsMembers] = useState<OpsMember[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [showAddOps, setShowAddOps] = useState(false);
  const [savingOps, setSavingOps] = useState(false);
  const [newOps, setNewOps] = useState({ name: '', name_ar: '', email: '', phone: '' });

  useEffect(() => {
    fetchBands();
    fetchOpsTeam();
  }, []);

  const fetchBands = async () => {
    setLoadingBands(true);
    try {
      const res = await adminFetch('/admin/ticket-bands');
      const data = await res.json();
      if (data.success) setBands(data.bands || []);
    } catch (e) { console.error('Error fetching bands:', e); }
    finally { setLoadingBands(false); }
  };

  const fetchOpsTeam = async () => {
    setLoadingOps(true);
    try {
      const res = await adminFetch('/admin/operations-team');
      const data = await res.json();
      if (data.success) setOpsMembers(data.members || []);
    } catch (e) { console.error('Error fetching ops team:', e); }
    finally { setLoadingOps(false); }
  };

  const handleAddBand = async () => {
    if (!newBand.destination || !newBand.max_sar) { toast.error(t('Destination and max SAR are required', 'الوجهة والحد الأقصى مطلوبان')); return; }
    setSavingBand(true);
    try {
      const res = await adminFetch('/admin/ticket-bands', { method: 'POST', body: JSON.stringify(newBand) });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Ticket band added', 'تم إضافة نطاق التذاكر'));
        setShowAddBand(false);
        setNewBand({ destination: '', destination_ar: '', country: '', country_ar: '', min_sar: 1500, max_sar: 0 });
        fetchBands();
      } else { toast.error(data.message); }
    } catch (e) { toast.error(t('Error adding band', 'خطأ في الإضافة')); }
    finally { setSavingBand(false); }
  };

  const handleUpdateBand = async () => {
    if (!editingBand) return;
    setSavingBand(true);
    try {
      const res = await adminFetch(`/admin/ticket-bands/${editingBand.id}`, { method: 'PATCH', body: JSON.stringify(editingBand) });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Band updated', 'تم تحديث النطاق'));
        setEditingBand(null);
        fetchBands();
      } else { toast.error(data.message); }
    } catch (e) { toast.error(t('Error updating band', 'خطأ في التحديث')); }
    finally { setSavingBand(false); }
  };

  const handleDeleteBand = async (id: string) => {
    if (!confirm(t('Delete this band?', 'حذف هذا النطاق؟'))) return;
    try {
      const res = await adminFetch(`/admin/ticket-bands/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success(t('Band deleted', 'تم حذف النطاق')); fetchBands(); }
      else toast.error(data.message);
    } catch (e) { toast.error(t('Error deleting band', 'خطأ في الحذف')); }
  };

  const handleAddOps = async () => {
    if (!newOps.name || !newOps.email) { toast.error(t('Name and email are required', 'الاسم والبريد الإلكتروني مطلوبان')); return; }
    setSavingOps(true);
    try {
      const res = await adminFetch('/admin/operations-team', { method: 'POST', body: JSON.stringify(newOps) });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Operations member added', 'تم إضافة عضو العمليات'));
        setShowAddOps(false);
        setNewOps({ name: '', name_ar: '', email: '', phone: '' });
        fetchOpsTeam();
      } else { toast.error(data.message); }
    } catch (e) { toast.error(t('Error adding member', 'خطأ في الإضافة')); }
    finally { setSavingOps(false); }
  };

  const handleDeleteOps = async (id: string) => {
    if (!confirm(t('Remove this member?', 'إزالة هذا العضو؟'))) return;
    try {
      const res = await adminFetch(`/admin/operations-team/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success(t('Member removed', 'تم إزالة العضو')); fetchOpsTeam(); }
      else toast.error(data.message);
    } catch (e) { toast.error(t('Error removing member', 'خطأ في الإزالة')); }
  };

  const destName = (b: TicketBand) => language === 'ar' ? b.destination_ar : b.destination;
  const countryName = (b: TicketBand) => language === 'ar' ? b.country_ar : b.country;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="w-6 h-6 text-indigo-600" />
          {t('Ticket Management', 'إدارة التذاكر')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            'Manage annual ticket price bands per destination and configure operations team contacts for ticket processing.',
            'إدارة نطاقات أسعار التذاكر السنوية حسب الوجهة وتحديد فريق العمليات لمعالجة الطلبات.'
          )}
        </p>
      </div>

      <Tabs defaultValue="bands">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="bands" className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            {t('Ticket Price Bands', 'نطاقات أسعار التذاكر')}
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {t('Operations Team', 'فريق العمليات')}
          </TabsTrigger>
        </TabsList>

        {/* ── Ticket Price Bands ── */}
        <TabsContent value="bands" className="space-y-4 mt-4">
          {/* Info box */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-950/20 p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                {t('How Ticket Bands Work', 'كيف تعمل نطاقات التذاكر')}
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1 leading-relaxed">
                {t(
                  'Each destination has a minimum (1,500 SAR by default) and maximum price cap. When an employee requests an annual ticket, they will see a reminder note showing their allowed ticket range. Any amount above the cap is the employee\'s responsibility.',
                  'كل وجهة له�� حد أدنى (1,500 ريال افتراضياً) وحد أقصى للسعر. عند طلب التذكرة السنوية، يظهر للموظف تنبيه بنطاق التذكرة المسموح به. أي مبلغ فوق الحد الأقصى يتحمله الموظف.'
                )}
              </p>
              <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800/50">
                <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                  {t('Nationality → Band Auto-Linking', 'الربط التلقائي: الجنسية → النطاق')}
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5 leading-relaxed">
                  {t(
                    'The system automatically matches each employee\'s nationality (from their profile) to a ticket band by country. For example, an "Egyptian" employee is matched to bands with country "Egypt". To set this up: (1) Set the employee\'s nationality in Employee Management → Edit → Basic Info. (2) Add ticket bands here with the matching country name (e.g. "Egypt", "Lebanon", "India"). The system handles the nationality-to-country conversion automatically (Egyptian→Egypt, Lebanese→Lebanon, etc.).',
                    'يقوم النظام تلقائياً بمطابقة جنسية كل موظف (من ملفه الشخصي) مع نطاق التذاكر حسب الدولة. مثلاً، الموظف "مصري" يُطابَق مع النطاقات التي بلدها "Egypt". للإعداد: (1) حدد جنسية الموظف في إدارة الموظفين → تعديل → المعلومات الأساسية. (2) أضف نطاقات التذاكر هنا مع اسم الدولة المطابق (مثل "Egypt"، "Lebanon"، "India"). يتولى النظام التحويل التلقائي (مصري→مصر، لبناني→لبنان، إلخ).'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {bands.length} {t('destinations configured', 'وجهة محددة')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchBands} className="gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> {t('Refresh', 'تحديث')}
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1" onClick={() => setShowAddBand(true)}>
                <Plus className="w-4 h-4" /> {t('Add Destination', 'إضافة وجهة')}
              </Button>
            </div>
          </div>

          {loadingBands ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin me-2" /> {t('Loading...', 'جاري التحميل...')}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {bands.map(band => (
                <div key={band.id} className="border rounded-xl bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        <p className="font-semibold">{destName(band)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{countryName(band)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingBand({ ...band })}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteBand(band.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">{t('Price Range (SAR)', 'نطاق السعر (ريال)')}</p>
                    <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                      {band.min_sar.toLocaleString()} — {band.max_sar.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t(`Cap: ${band.max_sar.toLocaleString()} SAR — employee pays any excess`, `السقف: ${band.max_sar.toLocaleString()} ريال — الزيادة على عاتق الموظف`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Operations Team ── */}
        <TabsContent value="operations" className="space-y-4 mt-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20 p-4 flex items-start gap-3">
            <Settings2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {t('Operations Team Role', 'دور فريق العمليات')}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                {t(
                  'Operations team members receive email notifications whenever an annual ticket request is approved. They are responsible for processing the booking.',
                  'يتلقى أعضاء فريق العمليات إشعارات بريد إلكتروني عند الموافقة على طلبات التذاكر السنوية، وهم المسؤولون عن معالجة الحجز.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {opsMembers.length} {t('members', 'أعضاء')}
            </p>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => setShowAddOps(true)}>
              <Plus className="w-4 h-4" /> {t('Add Member', 'إضافة عضو')}
            </Button>
          </div>

          {loadingOps ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin me-2" /> {t('Loading...', 'جاري التحميل...')}
            </div>
          ) : opsMembers.length === 0 ? (
            <div className="border rounded-xl bg-card py-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 opacity-20 mx-auto mb-2" />
              <p className="text-sm">{t('No operations team members yet', 'لا يوجد أعضاء في فريق العمليات')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {opsMembers.map(m => (
                <div key={m.id} className="border rounded-xl bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{m.name}</p>
                      {m.name_ar && m.name_ar !== m.name && (
                        <p className="text-sm text-muted-foreground" dir="rtl">{m.name_ar}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteOps(m.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" /> <span className="truncate">{m.email}</span>
                    </div>
                    {m.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> {m.phone}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Band Dialog */}
      <Dialog open={showAddBand} onOpenChange={o => { if (!o) setShowAddBand(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              {t('Add Destination Band', 'إضافة نطاق وجهة')}
            </DialogTitle>
            <DialogDescription>
              {t('Set the ticket price range for a new destination.', 'حدد نطاق سعر التذكرة لوجهة جديدة.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('Destination (EN)', 'الوجهة (إنجليزي)')}</Label>
              <Input value={newBand.destination} onChange={e => setNewBand(p => ({ ...p, destination: e.target.value }))} placeholder="e.g. Beirut" />
            </div>
            <div className="space-y-1">
              <Label>{t('Destination (AR)', 'الوجهة (عربي)')}</Label>
              <Input value={newBand.destination_ar} onChange={e => setNewBand(p => ({ ...p, destination_ar: e.target.value }))} placeholder="بيروت" dir="rtl" />
            </div>
            <div className="space-y-1">
              <Label>{t('Country (EN)', 'الدولة (إنجليزي)')}</Label>
              <Input value={newBand.country} onChange={e => setNewBand(p => ({ ...p, country: e.target.value }))} placeholder="Lebanon" />
            </div>
            <div className="space-y-1">
              <Label>{t('Country (AR)', 'الدولة (عربي)')}</Label>
              <Input value={newBand.country_ar} onChange={e => setNewBand(p => ({ ...p, country_ar: e.target.value }))} placeholder="لبنان" dir="rtl" />
            </div>
            <div className="space-y-1">
              <Label>{t('Min Price (SAR)', 'الحد الأدنى (ريال)')}</Label>
              <Input type="number" value={newBand.min_sar} onChange={e => setNewBand(p => ({ ...p, min_sar: parseFloat(e.target.value) || 1500 }))} />
              <p className="text-[10px] text-muted-foreground">{t('Default: 1,500 SAR', 'الافتراضي: 1,500 ريال')}</p>
            </div>
            <div className="space-y-1">
              <Label>{t('Max Price / Cap (SAR)', 'الحد الأقصى (ريال)')}</Label>
              <Input type="number" value={newBand.max_sar || ''} onChange={e => setNewBand(p => ({ ...p, max_sar: parseFloat(e.target.value) || 0 }))} placeholder="2300" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowAddBand(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleAddBand} disabled={savingBand} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingBand ? <RefreshCw className="w-4 h-4 animate-spin me-1" /> : <Save className="w-4 h-4 me-1" />}
              {t('Add Band', 'إضافة النطاق')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Band Dialog */}
      <Dialog open={!!editingBand} onOpenChange={o => { if (!o) setEditingBand(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              {t('Edit Destination Band', 'تعديل نطاق الوجهة')}
            </DialogTitle>
          </DialogHeader>
          {editingBand && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t('Destination (EN)', 'الوجهة (إنجليزي)')}</Label>
                <Input value={editingBand.destination} onChange={e => setEditingBand(p => p ? ({ ...p, destination: e.target.value }) : p)} />
              </div>
              <div className="space-y-1">
                <Label>{t('Destination (AR)', 'الوجهة (عربي)')}</Label>
                <Input value={editingBand.destination_ar} onChange={e => setEditingBand(p => p ? ({ ...p, destination_ar: e.target.value }) : p)} dir="rtl" />
              </div>
              <div className="space-y-1">
                <Label>{t('Country (EN)', 'الدولة (إنجليزي)')}</Label>
                <Input value={editingBand.country} onChange={e => setEditingBand(p => p ? ({ ...p, country: e.target.value }) : p)} />
              </div>
              <div className="space-y-1">
                <Label>{t('Country (AR)', 'الدولة (عربي)')}</Label>
                <Input value={editingBand.country_ar} onChange={e => setEditingBand(p => p ? ({ ...p, country_ar: e.target.value }) : p)} dir="rtl" />
              </div>
              <div className="space-y-1">
                <Label>{t('Min Price (SAR)', 'الحد الأدنى (ريال)')}</Label>
                <Input type="number" value={editingBand.min_sar} onChange={e => setEditingBand(p => p ? ({ ...p, min_sar: parseFloat(e.target.value) || 1500 }) : p)} />
              </div>
              <div className="space-y-1">
                <Label>{t('Max Price / Cap (SAR)', 'الحد الأقصى (ريال)')}</Label>
                <Input type="number" value={editingBand.max_sar} onChange={e => setEditingBand(p => p ? ({ ...p, max_sar: parseFloat(e.target.value) || 0 }) : p)} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditingBand(null)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleUpdateBand} disabled={savingBand} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingBand ? <RefreshCw className="w-4 h-4 animate-spin me-1" /> : <Save className="w-4 h-4 me-1" />}
              {t('Save Changes', 'حفظ التغييرات')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Ops Member Dialog */}
      <Dialog open={showAddOps} onOpenChange={o => { if (!o) setShowAddOps(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              {t('Add Operations Member', 'إضافة عضو عمليات')}
            </DialogTitle>
            <DialogDescription>
              {t('This person will receive email notifications for approved ticket requests.', 'سيتلقى هذا الشخص إشعارات بريد إلكتروني بخصوص طلبات التذاكر المعتمدة.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('Name (EN)', 'الاسم (إنجليزي)')}</Label>
                <Input value={newOps.name} onChange={e => setNewOps(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="space-y-1">
                <Label>{t('Name (AR)', 'الاسم (عربي)')}</Label>
                <Input value={newOps.name_ar} onChange={e => setNewOps(p => ({ ...p, name_ar: e.target.value }))} placeholder="اسم عربي" dir="rtl" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('Email', 'البريد الإلكتروني')}</Label>
              <Input type="email" value={newOps.email} onChange={e => setNewOps(p => ({ ...p, email: e.target.value }))} placeholder="ops@yahala.co" />
            </div>
            <div className="space-y-1">
              <Label>{t('Phone (Optional)', 'الهاتف (اختياري)')}</Label>
              <Input value={newOps.phone} onChange={e => setNewOps(p => ({ ...p, phone: e.target.value }))} placeholder="+966..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowAddOps(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleAddOps} disabled={savingOps} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {savingOps ? <RefreshCw className="w-4 h-4 animate-spin me-1" /> : <Plus className="w-4 h-4 me-1" />}
              {t('Add Member', 'إضافة عضو')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
