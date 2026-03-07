// This file contains seed data that will be inserted on first server startup
// You can manually call the seed endpoint to populate the database

export const sampleCompanies = [
  {
    id: 1,
    name: 'Ya Hala for Travel & Tours',
    slug: 'ya-hala-travel-tours',
    logo_url: null
  },
  {
    id: 2,
    name: 'AlEtihad for Tours & Travel',
    slug: 'aletihad-tours-travel',
    logo_url: null
  }
];

// Today is 2026-03-03. 70 days = 2026-05-12, 68 days = 2026-05-10
export const sampleEmployees = [
  // ── Regular Employee (Company 1) — contract expiring in ~70 days ───────────
  {
    id: 10001,
    password: 'demo123',
    full_name: 'Ahmed Al-Saud',
    full_name_ar: 'أحمد السعود',
    email: 'ahmed.alsaud@yahala.co',
    iqama: '2234567890',
    phone: '+966501234567',
    date_of_birth: '1990-05-15',
    nationality: 'Saudi',
    gender: 'male',
    position: 'Travel Consultant',
    position_ar: 'مستشار سفر',
    iban: 'SA0380000000608010167519',
    bank_name: 'Al Rajhi Bank',
    salary: 8500,
    company_id: 1,
    role: 'employee',
    status: 'active',
    hire_date: '2021-01-15',
    contract_end_date: '2026-05-12',   // 70 days from 2026-03-03 → triggers 70-day alert
    manager_id: 10002,
    address: 'Riyadh, Saudi Arabia',
    emergency_contact: 'Ali Al-Saud',
    emergency_phone: '+966501234568',
    profile_completed: true,
    photo_url: null,
    limits: {
      annual_leave_balance: 21,
      sick_leave_balance: 30,
      emergency_leave_balance: 5
    }
  },

  // ── Manager (Company 1) ───────────────────────────────────────────────────
  {
    id: 10002,
    password: 'demo123',
    full_name: 'Fatima Al-Zahrani',
    full_name_ar: 'فاطمة الزهراني',
    email: 'fatima.alzahrani@yahala.co',
    iqama: '2345678901',
    phone: '+966502345678',
    date_of_birth: '1985-08-22',
    nationality: 'Saudi',
    gender: 'female',
    position: 'HR Manager',
    position_ar: 'مديرة الموارد البشرية',
    iban: 'SA0380000000608010167520',
    bank_name: 'Saudi National Bank',
    salary: 14000,
    company_id: 1,
    role: 'manager',
    status: 'active',
    hire_date: '2020-03-10',
    contract_end_date: '2027-03-10',   // Not expiring soon
    manager_id: null,
    address: 'Riyadh, Saudi Arabia',
    emergency_contact: 'Khalid Al-Zahrani',
    emergency_phone: '+966502345679',
    profile_completed: true,
    photo_url: null,
    limits: {
      annual_leave_balance: 21,
      sick_leave_balance: 30,
      emergency_leave_balance: 5
    }
  },

  // ── Accountant (Company 2) — contract expiring in ~68 days ───────────────
  {
    id: 10003,
    password: 'demo123',
    full_name: 'Mohammed Bin Ali',
    full_name_ar: 'محمد بن علي',
    email: 'mohammed.binali@aletihad.co',
    iqama: '2456789012',
    phone: '+966503456789',
    date_of_birth: '1988-03-10',
    nationality: 'Saudi',
    gender: 'male',
    position: 'Senior Accountant',
    position_ar: 'محاسب أول',
    iban: 'SA0380000000608010167521',
    bank_name: 'Alinma Bank',
    salary: 11000,
    company_id: 2,
    role: 'accountant',
    status: 'active',
    hire_date: '2022-06-01',
    contract_end_date: '2026-05-10',   // 68 days from 2026-03-03 → triggers 70-day alert
    manager_id: 10002,
    address: 'Jeddah, Saudi Arabia',
    emergency_contact: 'Ahmed Bin Ali',
    emergency_phone: '+966503456790',
    profile_completed: true,
    photo_url: null,
    limits: {
      annual_leave_balance: 21,
      sick_leave_balance: 30,
      emergency_leave_balance: 5
    }
  },

  // ── Regular Employee (Company 2) ─────────────────────────────────────────
  {
    id: 10004,
    password: 'demo123',
    full_name: 'Sarah Al-Mutairi',
    full_name_ar: 'سارة المطيري',
    email: 'sarah.almutairi@aletihad.co',
    iqama: '2567890123',
    phone: '+966504567890',
    date_of_birth: '1995-11-30',
    nationality: 'Saudi',
    gender: 'female',
    position: 'Customer Relations Officer',
    position_ar: 'مسؤولة علاقات العملاء',
    iban: 'SA0380000000608010167522',
    bank_name: 'Al Rajhi Bank',
    salary: 7000,
    company_id: 2,
    role: 'employee',
    status: 'active',
    hire_date: '2023-09-01',
    contract_end_date: '2027-09-01',   // Not expiring soon
    manager_id: 10002,
    address: 'Jeddah, Saudi Arabia',
    emergency_contact: 'Nora Al-Mutairi',
    emergency_phone: '+966504567891',
    profile_completed: true,
    photo_url: null,
    limits: {
      annual_leave_balance: 21,
      sick_leave_balance: 30,
      emergency_leave_balance: 5
    }
  },

  // ── Owner (Company 1) — full access to exit permissions ──────────────────
  {
    id: 10005,
    password: 'demo123',
    full_name: 'Khalid Al-Harbi',
    full_name_ar: 'خالد الحربي',
    email: 'khalid.alharbi@yahala.co',
    iqama: '1098765432',
    phone: '+966505678901',
    date_of_birth: '1975-04-20',
    nationality: 'Saudi',
    gender: 'male',
    position: 'Chief Executive Officer',
    position_ar: 'الرئيس التنفيذي',
    iban: 'SA0380000000608010167523',
    bank_name: 'Saudi National Bank',
    salary: 35000,
    company_id: 1,
    role: 'owner',
    status: 'active',
    hire_date: '2019-01-01',
    contract_end_date: '2028-01-01',   // Not expiring soon
    manager_id: null,
    address: 'Riyadh, Saudi Arabia',
    emergency_contact: 'Rasha Al-Harbi',
    emergency_phone: '+966505678902',
    profile_completed: true,
    photo_url: null,
    limits: {
      annual_leave_balance: 30,
      sick_leave_balance: 30,
      emergency_leave_balance: 10
    }
  }
];
