import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Download, Upload, Eye, Edit2, Trash2, UserCheck, UserX, FileText, Calendar, Mail, Phone, Building2, CreditCard, User, Lock, History } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { DocumentManagement } from '../components/DocumentManagement';
import { EmployeeRequestHistory } from '../components/EmployeeRequestHistory';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { adminFetch } from '../utils/adminApi';
import { sendPasswordResetEmail } from '../utils/emailService';

interface EmployeeManagementProps {
  onBack: () => void;
}

interface Employee {
  id: number;
  full_name: string;
  full_name_ar?: string;
  email?: string;
  phone?: string;
  position?: string;
  position_ar?: string;
  company_id?: number;
  iban?: string;
  bank_name?: string;
  date_of_birth?: string;
  nationality?: string;
  iqama?: string;
  hire_date?: string;
  contract_end_date?: string;
  salary?: number;
  status?: 'active' | 'inactive';
  gender?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  manager_id?: number;
  role?: 'employee' | 'manager' | 'accountant' | 'owner';
  companies?: {
    name: string;
  };
}

interface Company {
  id: number;
  name: string;
  slug: string;
}

export function EmployeeManagement({ onBack }: EmployeeManagementProps) {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Request History dialog
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);

  // Password Reset State
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [resettingEmployee, setResettingEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Form state
  const [newEmployee, setNewEmployee] = useState({
    id: '',
    full_name: '',
    full_name_ar: '',
    email: '',
    phone: '',
    password: '',
    company_id: '',
    position: '',
    position_ar: '',
    iban: '',
    bank_name: '',
    date_of_birth: '',
    nationality: '',
    iqama: '',
    hire_date: '',
    salary: '',
    status: 'active',
    gender: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    manager_id: '',
    role: 'employee'
  });
  
  const [skipSetup, setSkipSetup] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchQuery, filterCompany, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchCompanies()]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    try {
      const response = await adminFetch('/admin/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(t('Failed to load employees', 'فشل ت��ميل الموظفين'));
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/companies`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.full_name?.toLowerCase().includes(query) ||
        emp.full_name_ar?.toLowerCase().includes(query) ||
        emp.id?.toString().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.phone?.includes(query)
      );
    }

    // Company filter
    if (filterCompany !== 'all') {
      filtered = filtered.filter(emp => emp.company_id === parseInt(filterCompany));
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(emp => (emp.status || 'active') === filterStatus);
    }

    setFilteredEmployees(filtered);
  };

  const handleAddEmployee = async () => {
    // Validate required fields: ID, name, email, and company
    if (!newEmployee.id || !newEmployee.full_name || !newEmployee.email || !newEmployee.company_id) {
      toast.error(t('Please fill in required fields (ID, Name, Email, Company)', 'يرجى ملء الحقول المطلوبة (الرقم، الاسم، البريد الإلكتروني، الشركة)'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.email)) {
      toast.error(t('Please enter a valid email address', 'يرجى إدخال عنوان بريد إلكتروني صالح'));
      return;
    }

    // Validate password if skipSetup is true
    if (skipSetup && (!newEmployee.password || newEmployee.password.length < 8)) {
      toast.error(t('Password must be at least 8 characters', 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل'));
      return;
    }

    try {
      const response = await adminFetch('/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
            id: parseInt(newEmployee.id),
            full_name: newEmployee.full_name,
            full_name_ar: newEmployee.full_name_ar || null,
            email: newEmployee.email,
            phone: newEmployee.phone || null,
            company_id: parseInt(newEmployee.company_id),
            position: newEmployee.position || null,
            position_ar: newEmployee.position_ar || null,
            iban: newEmployee.iban || null,
            bank_name: newEmployee.bank_name || null,
            date_of_birth: newEmployee.date_of_birth || null,
            nationality: newEmployee.nationality || null,
            iqama: newEmployee.iqama || null,
            hire_date: newEmployee.hire_date || null,
            salary: newEmployee.salary ? parseFloat(newEmployee.salary) : null,
            status: newEmployee.status || 'active',
            gender: newEmployee.gender || null,
            address: newEmployee.address || null,
            emergency_contact: newEmployee.emergency_contact || null,
            emergency_phone: newEmployee.emergency_phone || null,
            password: skipSetup ? newEmployee.password : undefined,
            manager_id: newEmployee.manager_id && newEmployee.manager_id !== 'none' ? parseInt(newEmployee.manager_id) : null,
            role: newEmployee.role || 'employee'
          })
      });
      const data = await response.json();
      if (data.success) {
        const successMessage = skipSetup 
          ? t(
              'Employee added successfully! They can now login with the password you provided.',
              'تم إضافة الموظف بنجاح! يمكنهم الآن تسجيل الدخول بكلمة المرور التي قدمتها.'
            )
          : t(
              'Employee added successfully! Invitation email has been sent.',
              'تم إضافة الموظف بنجاح! تم إرسال بريد الدعوة.'
            );
        toast.success(successMessage);
        setIsAddOpen(false);
        resetForm();
        fetchEmployees();
      } else {
        toast.error(data.message || t('Failed to add employee', 'فشل إضافة الموظف'));
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error(t('Failed to add employee', 'فشل إضافة الموظف'));
    }
  };

  const handleResetPassword = async () => {
    if (!resettingEmployee || !newPassword) return;

    if (!resettingEmployee.email) {
      toast.error(t('This employee has no email address', 'هذا الموظف ليس لديه بريد إلكتروني'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('Password must be at least 6 characters', 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'));
      return;
    }

    setIsResetting(true);
    try {
      // 1. Update password in database
      const response = await adminFetch(`/admin/employees/${resettingEmployee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) throw new Error('Failed to update password');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to update password');

      // 2. Send email notification
      await sendPasswordResetEmail(
        {
          email: resettingEmployee.email!, // We checked for email existence above
          full_name: resettingEmployee.full_name,
          full_name_ar: resettingEmployee.full_name_ar
        },
        newPassword,
        'ar'
      );

      toast.success(t('Password reset successfully and email sent', 'تم إعادة تعيين كلمة المرور وإرسال البريد الإلكتروني'));
      setIsPasswordResetOpen(false);
      setResettingEmployee(null);
      setNewPassword('');

    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(t('Failed to reset password', 'فشل إعادة تعيين كلمة المرور'));
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee || !editingEmployee.full_name || !editingEmployee.company_id) {
      toast.error(t('Please fill in required fields', 'يرجى ملء الحقول المطلوبة'));
      return;
    }

    try {
      const response = await adminFetch(`/admin/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editingEmployee)
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('Error updating employee - Response:', text);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success(t('Employee updated successfully', 'تم تحديث الموظف بنجاح'));
        setIsEditOpen(false);
        setEditingEmployee(null);
        fetchEmployees();
      } else {
        toast.error(data.message || t('Failed to update employee', 'فشل تحديث الموظف'));
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(t('Failed to update employee', 'فشل تحديث الموظف'));
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm(t('Are you sure you want to delete this employee?', 'هل أنت متأكد من حذف هذا الموظف؟'))) {
      return;
    }

    try {
      const response = await adminFetch(`/admin/employees/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Employee deleted successfully', 'تم حذف الموظف بنجاح'));
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(t('Failed to delete employee', 'فشل حذف الموظف'));
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await adminFetch(`/admin/employees/${employee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Error updating status - Response:', text);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success(t('Status updated', 'تم تحديث الحالة'));
        fetchEmployees();
      } else {
        toast.error(data.message || t('Failed to update status', 'فشل تحديث الحالة'));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('Failed to update status', 'فشل تحديث الحالة'));
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Position', 'Company', 'Status', 'Hire Date'];
    const rows = filteredEmployees.map(emp => [
      emp.id,
      emp.full_name,
      emp.email || '-',
      emp.phone || '-',
      emp.position || '-',
      emp.companies?.name || '-',
      emp.status || 'active',
      emp.hire_date || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t('Export completed', 'تم التصدير'));
  };

  const resetForm = () => {
    setNewEmployee({
      id: '',
      full_name: '',
      full_name_ar: '',
      email: '',
      phone: '',
      password: '',
      company_id: '',
      position: '',
      position_ar: '',
      iban: '',
      bank_name: '',
      date_of_birth: '',
      nationality: '',
      iqama: '',
      hire_date: '',
      salary: '',
      status: 'active',
      gender: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
      manager_id: '',
      role: 'employee'
    });
    setSkipSetup(false);
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  const toggleSelectEmployee = (id: number) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]
    );
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => (e.status || 'active') === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    filtered: filteredEmployees.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ms-2">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('Back to Dashboard', 'العودة إلى لوحة التحكم')}
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl mb-2">
                {t('Employee Management', 'إدارة الموظفين')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('Manage all employees, view details, and track status', 'إدارة جميع الموظفين وعرض التفاصيل وتتبع الحالة')}
              </p>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 me-2" />
              {t('Add Employee', 'إضافة موظف')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Total', 'الإجمالي')}</p>
                <p className="text-2xl mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#006B7D]/10 dark:bg-[#006B7D]/20 flex items-center justify-center">
                <User className="w-5 h-5 text-[#006B7D] dark:text-[#00A89C]" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Active', 'نشط')}</p>
                <p className="text-2xl mt-1 text-[#7AC143]">{stats.active}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#7AC143]/10 dark:bg-[#7AC143]/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-[#7AC143]" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Inactive', 'غير نشط')}</p>
                <p className="text-2xl mt-1 text-red-600 dark:text-red-400">{stats.inactive}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Showing', 'معروض')}</p>
                <p className="text-2xl mt-1">{stats.filtered}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search & Export */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('Search by name, ID, email, or phone...', 'ابحث بالاسم أو الرقم أو البريد أو الهاتف...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
              </div>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 me-2" />
                {t('Export', 'تصدير')}
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{t('Company', 'الشركة')}</Label>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Companies', 'جميع الشركات')}</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('Status', 'الحالة')}</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Status', 'جميع الحالات')}</SelectItem>
                    <SelectItem value="active">{t('Active', 'نشط')}</SelectItem>
                    <SelectItem value="inactive">{t('Inactive', 'غير نشط')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Actions */}
            {selectedEmployees.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-[#7AC143]/10 dark:bg-[#7AC143]/20 border border-[#7AC143]/20 rounded-lg">
                <span className="text-sm text-[#7AC143] dark:text-[#7AC143]">
                  {selectedEmployees.length} {t('selected', 'محدد')}
                </span>
                <Button size="sm" variant="outline" onClick={() => setSelectedEmployees([])}>
                  {t('Clear', 'مسح')}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Employees Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-start">
                    <Checkbox
                      checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-start text-sm">{t('ID', 'الرقم')}</th>
                  <th className="px-4 py-3 text-start text-sm">{t('Employee', 'الموظف')}</th>
                  <th className="px-4 py-3 text-start text-sm">{t('Contact', 'التواصل')}</th>
                  <th className="px-4 py-3 text-start text-sm">{t('Position', 'المنصب')}</th>
                  <th className="px-4 py-3 text-start text-sm">{t('Company', 'الشركة')}</th>
                  <th className="px-4 py-3 text-start text-sm">{t('Status', 'الحالة')}</th>
                  <th className="px-4 py-3 text-start text-sm">{t('Actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {t('Loading...', 'جاري التحميل...')}
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {t('No employees found', 'لا يوجد موظفين')}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleSelectEmployee(employee.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{employee.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {t(employee.full_name, employee.full_name_ar || employee.full_name)}
                          </p>
                          {employee.iqama && (
                            <p className="text-xs text-muted-foreground">{t('Iqama', 'إقامة')}: {employee.iqama}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          {employee.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{employee.email}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{employee.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {t(employee.position || '-', employee.position_ar || employee.position || '-')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {employee.companies?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            (employee.status || 'active') === 'active'
                              ? 'bg-[#7AC143]/10 text-[#7AC143] dark:bg-[#1E3821] dark:text-[#7AC143] border border-[#7AC143]/20'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                          }
                        >
                          {t(
                            (employee.status || 'active') === 'active' ? 'Active' : 'Inactive',
                            (employee.status || 'active') === 'active' ? 'نشط' : 'غير نشط'
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsViewOpen(true);
                            }}
                            title={t('View Profile', 'عرض الملف الشخصي')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            onClick={() => {
                              setHistoryEmployee(employee);
                              setIsHistoryOpen(true);
                            }}
                            title={t('Request History & Print', 'سجل الطلبات والطباعة')}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingEmployee(employee);
                              setIsEditOpen(true);
                            }}
                            title={t('Edit Employee', 'تعديل الموظف')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600 dark:text-orange-400"
                            onClick={() => {
                              setResettingEmployee(employee);
                              setNewPassword('');
                              setIsPasswordResetOpen(true);
                            }}
                            title={t('Reset Password', 'إعادة تعيين كلمة المرور')}
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(employee)}
                          >
                            {(employee.status || 'active') === 'active' ? (
                              <UserX className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-[#7AC143]" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Add New Employee', 'إضافة موظف جديد')}</DialogTitle>
            <DialogDescription>
              {t('Fill in all employee information', 'املأ جميع معلومات الموظف')}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{t('Basic Info', 'المعلومات الأساسي��')}</TabsTrigger>
              <TabsTrigger value="employment">{t('Employment', 'الوظيفة')}</TabsTrigger>
              <TabsTrigger value="other">{t('Other Details', 'تفاصيل أخرى')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Employee ID', 'رقم الموظف')} *</Label>
                  <Input
                    type="number"
                    value={newEmployee.id}
                    onChange={(e) => setNewEmployee({...newEmployee, id: e.target.value})}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Email (Username)', 'البريد الإلكتروني (اسم المستخدم)')} *</Label>
                  <Input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    placeholder="employee@yahala.co"
                  />
                  {!skipSetup && (
                    <p className="text-xs text-muted-foreground">
                      {t('Email will be used as username. A temporary password will be auto-generated and sent via email.',
                         'سيتم استخدام البريد الإلكتروني كاسم مستخدم. سيتم إنشاء كلمة مرور مؤقتة تلقائيًا وإرسالها عبر البريد الإلكتروني.')}
                    </p>
                  )}
                </div>
                
                {/* Skip First-Time Setup Option */}
                <div className="col-span-2 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="skipSetup"
                      checked={skipSetup}
                      onCheckedChange={(checked) => setSkipSetup(checked as boolean)}
                    />
                    <div className="flex-1">
                      <label htmlFor="skipSetup" className="cursor-pointer">
                        <p className="font-medium text-sm">
                          {t('⚡ Skip First-Time Setup (Advanced)', '⚡ تخطي الإعداد الأولي (متقدم)')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t(
                            'When checked: Employee can login immediately with a password you provide. No invitation email will be sent and setup is not required.',
                            'عند التحديد: يمكن للموظف تسجيل الدخول فوراً بكلمة المرور التي تقدمها. لن يتم إرسال بريد الدعوة ولا يتطلب الإعداد.'
                          )}
                        </p>
                      </label>
                    </div>
                  </div>
                  
                  {skipSetup && (
                    <div className="mt-3 space-y-2">
                      <Label>{t('Password', 'كلمة المرور')} *</Label>
                      <Input
                        type="password"
                        value={newEmployee.password}
                        onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                        placeholder={t('Enter a strong password', 'أدخل كلمة مرور قوية')}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'Password must be at least 8 characters with uppercase, lowercase, and number.',
                          'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل بأحرف كبيرة وصغيرة ورقم.'
                        )}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('Full Name (English)', 'الاسم الكامل (إنجليزي)')} *</Label>
                  <Input
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Full Name (Arabic)', 'الاسم الكامل (عربي)')}</Label>
                  <Input
                    value={newEmployee.full_name_ar}
                    onChange={(e) => setNewEmployee({...newEmployee, full_name_ar: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Phone', 'الهاتف')}</Label>
                  <Input
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Gender', 'الجنس')}</Label>
                  <Select value={newEmployee.gender} onValueChange={(v) => setNewEmployee({...newEmployee, gender: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select gender', 'اختر الجنس')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('Male', 'ذكر')}</SelectItem>
                      <SelectItem value="female">{t('Female', 'أنثى')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Date of Birth', 'تاريخ الميلاد')}</Label>
                  <Input
                    type="date"
                    value={newEmployee.date_of_birth}
                    onChange={(e) => setNewEmployee({...newEmployee, date_of_birth: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Nationality', 'الجنسية')}</Label>
                  <Input
                    value={newEmployee.nationality}
                    onChange={(e) => setNewEmployee({...newEmployee, nationality: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Iqama/ID Number', 'رقم الإقامة/الهوية')}</Label>
                  <Input
                    value={newEmployee.iqama}
                    onChange={(e) => setNewEmployee({...newEmployee, iqama: e.target.value})}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Company', 'الشركة')} *</Label>
                  <Select value={newEmployee.company_id} onValueChange={(v) => setNewEmployee({...newEmployee, company_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select company', 'اختر الشركة')} />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Position (English)', 'المنصب (إنجليزي)')}</Label>
                  <Input
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Position (Arabic)', 'المنصب (عربي)')}</Label>
                  <Input
                    value={newEmployee.position_ar}
                    onChange={(e) => setNewEmployee({...newEmployee, position_ar: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Hire Date', 'تاريخ التعيين')}</Label>
                  <Input
                    type="date"
                    value={newEmployee.hire_date}
                    onChange={(e) => setNewEmployee({...newEmployee, hire_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Salary', 'الراتب')}</Label>
                  <Input
                    type="number"
                    value={newEmployee.salary}
                    onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Status', 'الحالة')}</Label>
                  <Select value={newEmployee.status} onValueChange={(v) => setNewEmployee({...newEmployee, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Active', 'نشط')}</SelectItem>
                      <SelectItem value="inactive">{t('Inactive', 'غير نشط')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('IBAN', 'الآيبان')}</Label>
                  <Input
                    value={newEmployee.iban}
                    onChange={(e) => setNewEmployee({...newEmployee, iban: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Bank Name', 'اسم البنك')}</Label>
                  <Input
                    value={newEmployee.bank_name}
                    onChange={(e) => setNewEmployee({...newEmployee, bank_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Role', 'الدور')}</Label>
                  <Select value={newEmployee.role} onValueChange={(v) => setNewEmployee({...newEmployee, role: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t('Employee', 'موظف')}</SelectItem>
                      <SelectItem value="manager">{t('Manager / HR', 'مدير / موارد بشرية')}</SelectItem>
                      <SelectItem value="accountant">{t('Accountant', 'محاسب')}</SelectItem>
                      <SelectItem value="owner">{t('Owner', 'مالك')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Reports To (Manager)', 'يقدم تقرير إلى (المدير)')}</Label>
                  <Select value={newEmployee.manager_id} onValueChange={(v) => setNewEmployee({...newEmployee, manager_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select manager (optional)', 'اختر المدير (اختياري)')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('No Manager', 'بدون مدير')}</SelectItem>
                      {employees
                        .filter(emp => emp.role === 'manager' && emp.id.toString() !== newEmployee.id)
                        .map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.full_name} (ID: {emp.id})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('Select the manager this employee reports to', 'اختر المدير الذي يقدم له هذا الموظف تقريراً')}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="other" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('Address', 'العنوان')}</Label>
                  <Input
                    value={newEmployee.address}
                    onChange={(e) => setNewEmployee({...newEmployee, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('Emergency Contact Name', 'اسم جهة الاتصال للطوارئ')}</Label>
                    <Input
                      value={newEmployee.emergency_contact}
                      onChange={(e) => setNewEmployee({...newEmployee, emergency_contact: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Emergency Contact Phone', 'هاتف جهة الاتصال للطوارئ')}</Label>
                    <Input
                      value={newEmployee.emergency_phone}
                      onChange={(e) => setNewEmployee({...newEmployee, emergency_phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button onClick={handleAddEmployee}>
              {t('Add Employee', 'إضافة موظف')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar structure */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Employee', 'تعديل الموظف')}</DialogTitle>
            <DialogDescription>
              {t('Update employee information', 'تحديث معلومات الموظف')}
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Full Name', 'الاسم الكامل')}</Label>
                  <Input
                    value={editingEmployee.full_name}
                    onChange={(e) => setEditingEmployee({...editingEmployee, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Email', 'البريد الإلكتروني')}</Label>
                  <Input
                    value={editingEmployee.email || ''}
                    onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Phone', 'الهاتف')}</Label>
                  <Input
                    value={editingEmployee.phone || ''}
                    onChange={(e) => setEditingEmployee({...editingEmployee, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Position', 'المنصب')}</Label>
                  <Input
                    value={editingEmployee.position || ''}
                    onChange={(e) => setEditingEmployee({...editingEmployee, position: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Company', 'الشركة')}</Label>
                  <Select
                    value={editingEmployee.company_id?.toString()}
                    onValueChange={(v) => setEditingEmployee({...editingEmployee, company_id: parseInt(v)})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Status', 'الحالة')}</Label>
                  <Select
                    value={editingEmployee.status || 'active'}
                    onValueChange={(v) => setEditingEmployee({...editingEmployee, status: v as 'active' | 'inactive'})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Active', 'نشط')}</SelectItem>
                      <SelectItem value="inactive">{t('Inactive', 'غير نشط')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Role', 'الدور')}</Label>
                  <Select
                    value={editingEmployee.role || 'employee'}
                    onValueChange={(v) => setEditingEmployee({...editingEmployee, role: v as 'employee' | 'manager' | 'accountant' | 'owner'})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t('Employee', 'موظف')}</SelectItem>
                      <SelectItem value="manager">{t('Manager / HR', 'مدير / موارد بشرية')}</SelectItem>
                      <SelectItem value="accountant">{t('Accountant', 'محاسب')}</SelectItem>
                      <SelectItem value="owner">{t('Owner', 'مالك')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Reports To (Manager)', 'يقدم تقرير إلى (المدير)')}</Label>
                  <Select
                    value={editingEmployee.manager_id?.toString() || 'none'}
                    onValueChange={(v) => setEditingEmployee({...editingEmployee, manager_id: v === 'none' ? undefined : parseInt(v)})}
                  >
                    <SelectTrigger><SelectValue placeholder={t('Select manager (optional)', 'اختر المدير (اختياري)')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('No Manager', 'بدون مدير')}</SelectItem>
                      {employees
                        .filter(emp => emp.role === 'manager' && emp.id !== editingEmployee.id)
                        .map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.full_name} (ID: {emp.id})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Contract End Date', 'تاريخ انتهاء العقد')}</Label>
                  <Input
                    type="date"
                    value={(editingEmployee as any).contract_end_date || ''}
                    onChange={(e) => setEditingEmployee({...editingEmployee, ...{contract_end_date: e.target.value || null} as any})}
                  />
                  <p className="text-xs text-muted-foreground">{t('Optional. Used for automatic contract expiry alerts (70 days before end).', 'اختياري. يُستخدم للتنبيه التلقائي عند اقتراب انتهاء العقد (70 يوماً قبل نهايته).')}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button onClick={handleUpdateEmployee}>
              {t('Save Changes', 'حفظ التغييرات')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Employee Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Employee Details', 'تفايل الموظف')}</DialogTitle>
            <DialogDescription>
              {t('View complete employee information', 'عرض معلومات الموظف الكاملة')}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">{t('Info', 'المعلومات')}</TabsTrigger>
                <TabsTrigger value="employment">{t('Employment', 'الوظيفة')}</TabsTrigger>
                <TabsTrigger value="requests">{t('Requests', 'الطلبات')}</TabsTrigger>
                <TabsTrigger value="documents">{t('Documents', 'الوثائق')}</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Employee ID', 'رقم الموظف')}</Label>
                    <p className="mt-1">{selectedEmployee.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Full Name', 'الاسم الكامل')}</Label>
                    <p className="mt-1">{selectedEmployee.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Email', 'البريد الإلكتروني')}</Label>
                    <p className="mt-1">{selectedEmployee.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Phone', 'الهاتف')}</Label>
                    <p className="mt-1">{selectedEmployee.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Date of Birth', 'تاريخ الميلاد')}</Label>
                    <p className="mt-1">{selectedEmployee.date_of_birth || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Nationality', 'الجنسية')}</Label>
                    <p className="mt-1">{selectedEmployee.nationality || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Iqama', 'الإقامة')}</Label>
                    <p className="mt-1">{selectedEmployee.iqama || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Gender', 'الجنس')}</Label>
                    <p className="mt-1">{selectedEmployee.gender || '-'}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="employment" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Company', 'الشركة')}</Label>
                    <p className="mt-1">{selectedEmployee.companies?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Position', 'المنصب')}</Label>
                    <p className="mt-1">{selectedEmployee.position || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Hire Date', 'تاريخ التعيين')}</Label>
                    <p className="mt-1">{selectedEmployee.hire_date || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Status', 'الحالة')}</Label>
                    <div className="mt-1">
                      <Badge className={(selectedEmployee.status || 'active') === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {t((selectedEmployee.status || 'active') === 'active' ? 'Active' : 'Inactive', (selectedEmployee.status || 'active') === 'active' ? 'نشط' : 'غير نشط')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('IBAN', 'الآيبان')}</Label>
                    <p className="mt-1 font-mono text-sm">{selectedEmployee.iban || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Bank', 'البنك')}</Label>
                    <p className="mt-1">{selectedEmployee.bank_name || '-'}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="requests" className="mt-4">
                {selectedEmployee && (
                  <EmployeeRequestHistory
                    employee={selectedEmployee}
                    company={companies.find(c => c.id === selectedEmployee.company_id) || null}
                    onClose={() => setIsViewOpen(false)}
                  />
                )}
              </TabsContent>
              <TabsContent value="documents" className="mt-4">
                <DocumentManagement employeeId={selectedEmployee.id.toString()} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Request History & Print Dialog ── */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-4xl w-full h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
            <DialogTitle className="sr-only">{t('Request History', 'سجل الطلبات')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 pt-2">
            {historyEmployee && (
              <EmployeeRequestHistory
                employee={historyEmployee}
                company={companies.find(c => c.id === historyEmployee.company_id) || null}
                onClose={() => setIsHistoryOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Reset Password', 'إعادة تعيين كلمة المرور')}</DialogTitle>
            <DialogDescription>
              {t(
                'Enter a new password for',
                'أدخل كلمة مرور جديدة لـ'
              )}{' '}
              <span className="font-medium">{resettingEmployee && t(resettingEmployee.full_name, resettingEmployee.full_name_ar || resettingEmployee.full_name)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('New Password', 'كلمة المرور الجديدة')}</Label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('Enter new password', 'أدخل كلمة مرور قوية')}
              />
              <p className="text-xs text-muted-foreground">
                {t('Minimum 6 characters. The employee will receive an email with the new password.', '6 أحرف على الأقل. سيتلقى الموظف بريدًا إلكترونيًا بكلمة المرور الجديدة.')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPasswordResetOpen(false)} disabled={isResetting}>
                {t('Cancel', 'إلغاء')}
              </Button>
              <Button onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 6 || isResetting}>
                {isResetting ? t('Resetting...', 'جاري إعادة التعيين...') : t('Reset Password', 'إعادة تعيين')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}