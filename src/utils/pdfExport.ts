// PDF Export Utility using jsPDF
// This will be imported dynamically when needed

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  headerColor?: string;
}

export interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export async function exportToPDF(
  data: any[],
  columns: TableColumn[],
  options: PDFExportOptions
) {
  // Dynamically import jsPDF and autoTable
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(options.headerColor || '#7AC143');
  doc.text(options.title, 14, 20);

  // Add subtitle if provided
  if (options.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 28);
  }

  // Add date
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generated: ${dateStr}`, 14, options.subtitle ? 34 : 28);

  // Generate table
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: data.map(row =>
      columns.map(col => {
        const value = row[col.dataKey];
        return value !== null && value !== undefined ? String(value) : '-';
      })
    ),
    startY: options.subtitle ? 40 : 34,
    theme: 'grid',
    headStyles: {
      fillColor: options.headerColor || '#7AC143',
      textColor: '#ffffff',
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: columns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {} as any)
  });

  // Add footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Ya Hala Group E-Portal',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  return doc;
}

export async function downloadPDF(doc: any, filename: string) {
  doc.save(filename);
}

export async function exportRequestsToPDF(requests: any[], language: 'en' | 'ar' = 'en') {
  const columns: TableColumn[] = [
    { header: language === 'en' ? 'Request ID' : 'رقم الطلب', dataKey: 'id', width: 30 },
    { header: language === 'en' ? 'Employee' : 'الموظف', dataKey: 'employeeName', width: 40 },
    { header: language === 'en' ? 'Type' : 'النوع', dataKey: 'type', width: 30 },
    { header: language === 'en' ? 'Status' : 'الحالة', dataKey: 'status', width: 25 },
    { header: language === 'en' ? 'Date' : 'التاريخ', dataKey: 'date', width: 35 }
  ];

  const formattedData = requests.map(r => ({
    id: r.id,
    employeeName: r.employees?.full_name || '-',
    type: r.type,
    status: r.status,
    date: r.start_date || new Date(r.created_at).toLocaleDateString()
  }));

  const doc = await exportToPDF(formattedData, columns, {
    title: language === 'en' ? 'Requests Report' : 'تقرير الطلبات',
    subtitle: language === 'en' ? 'Ya Hala Group E-Portal' : 'بوابة مجموعة يا هلا الإلكترونية',
    orientation: 'landscape',
    headerColor: '#7AC143'
  });

  const filename = `requests_report_${new Date().toISOString().split('T')[0]}.pdf`;
  await downloadPDF(doc, filename);
}

export async function exportEmployeesToPDF(employees: any[], language: 'en' | 'ar' = 'en') {
  const columns: TableColumn[] = [
    { header: language === 'en' ? 'ID' : 'الرقم', dataKey: 'id', width: 20 },
    { header: language === 'en' ? 'Name' : 'الاسم', dataKey: 'name', width: 50 },
    { header: language === 'en' ? 'Email' : 'البريد', dataKey: 'email', width: 50 },
    { header: language === 'en' ? 'Phone' : 'الهاتف', dataKey: 'phone', width: 35 },
    { header: language === 'en' ? 'Position' : 'المنصب', dataKey: 'position', width: 40 },
    { header: language === 'en' ? 'Status' : 'الحالة', dataKey: 'status', width: 25 }
  ];

  const formattedData = employees.map(emp => ({
    id: emp.id,
    name: emp.full_name,
    email: emp.email || '-',
    phone: emp.phone || '-',
    position: emp.position || '-',
    status: emp.status || 'active'
  }));

  const doc = await exportToPDF(formattedData, columns, {
    title: language === 'en' ? 'Employees Report' : 'تقرير الموظفين',
    subtitle: language === 'en' ? 'Ya Hala Group E-Portal' : 'بوابة مجموعة يا هلا الإلكترونية',
    orientation: 'landscape',
    headerColor: '#006B7D'
  });

  const filename = `employees_report_${new Date().toISOString().split('T')[0]}.pdf`;
  await downloadPDF(doc, filename);
}

export async function exportAnalyticsToPDF(stats: any, requests: any[], language: 'en' | 'ar' = 'en') {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Title
  doc.setFontSize(20);
  doc.setTextColor('#7AC143');
  doc.text(language === 'en' ? 'Analytics Report' : 'تقرير التحليلات', 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    14,
    28
  );

  // Summary Stats
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(language === 'en' ? 'Summary' : 'الملخص', 14, 40);

  const summaryData = [
    [language === 'en' ? 'Total Requests' : 'إجمالي الطلبات', stats.total],
    [language === 'en' ? 'Pending' : 'قيد المراجعة', stats.pending],
    [language === 'en' ? 'Approved' : 'موافق عليه', stats.approved],
    [language === 'en' ? 'Rejected' : 'مرفوض', stats.rejected]
  ];

  autoTable(doc, {
    body: summaryData,
    startY: 45,
    theme: 'plain',
    styles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right' }
    }
  });

  const filename = `analytics_report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
