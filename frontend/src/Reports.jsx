import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from './axios';
import { AgGridReact } from 'ag-grid-react';
import ExcelJS from 'exceljs';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

import { 
  MdTableChart, 
  MdTimeline, 
  MdLeaderboard, 
  MdPublic, 
  MdSchool, 
  MdWarning, 
  MdFileDownload,
  MdRefresh
} from 'react-icons/md';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('master');
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  // Chart references for Excel image embedding
  const forecastChartRef = useRef(null);
  const consultantChartRef = useRef(null);
  const countryChartRef = useRef(null);
  const universityChartRef = useRef(null);

  // Date filter state
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch student details
  const fetchStudents = () => {
    setLoading(true);
    axios.get('/api/students')
      .then(res => setStudents(res.data))
      .catch(err => console.error("Error fetching students:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Listen to dark mode updates to redraw charts appropriately
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Filter students based on date range
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (!s.created_at) return true;
      const createdDate = new Date(s.created_at);

      if (datePreset === 'all') return true;

      const now = new Date();
      const currentYear = now.getFullYear();

      if (datePreset === 'this_year') {
        return createdDate.getFullYear() === currentYear;
      }
      if (datePreset === 'last_year') {
        return createdDate.getFullYear() === currentYear - 1;
      }
      if (datePreset === 'this_semester') {
        const currentMonth = now.getMonth();
        const isS1 = currentMonth <= 5;
        const startMonth = isS1 ? 0 : 6;
        const endMonth = isS1 ? 5 : 11;
        
        const sDate = new Date(currentYear, startMonth, 1);
        const eDate = new Date(currentYear, endMonth + 1, 0, 23, 59, 59);
        return createdDate >= sDate && createdDate <= eDate;
      }
      if (datePreset === 'this_tri_semester') {
        const currentMonth = now.getMonth();
        let startMonth, endMonth;
        if (currentMonth <= 3) {
          startMonth = 0; endMonth = 3;
        } else if (currentMonth <= 7) {
          startMonth = 4; endMonth = 7;
        } else {
          startMonth = 8; endMonth = 11;
        }
        const sDate = new Date(currentYear, startMonth, 1);
        const eDate = new Date(currentYear, endMonth + 1, 0, 23, 59, 59);
        return createdDate >= sDate && createdDate <= eDate;
      }
      if (datePreset === 'custom') {
        const sDate = startDate ? new Date(startDate) : null;
        const eDate = endDate ? new Date(endDate + 'T23:59:59') : null;
        if (sDate && createdDate < sDate) return false;
        if (eDate && createdDate > eDate) return false;
        return true;
      }

      return true;
    });
  }, [students, datePreset, startDate, endDate]);

  // Recalculate metrics on changes (filtering out dropouts for revenue calculations to be clean)
  const activeStudents = useMemo(() => filteredStudents.filter(s => !s.drop_out_flag), [filteredStudents]);
  const totalRevenueLkr = useMemo(() => activeStudents.reduce((sum, s) => sum + (parseFloat(s.expected_income_lkr) || 0), 0), [activeStudents]);
  const totalRevenueUsd = useMemo(() => activeStudents.reduce((sum, s) => sum + (parseFloat(s.expected_income_usd) || 0), 0), [activeStudents]);
  const activeStudentsCount = activeStudents.length;
  const averageRevenueLkr = activeStudentsCount > 0 ? (totalRevenueLkr / activeStudentsCount) : 0;

  // Helper parser to sort intakes (Expected Timeframes) chronologically
  const parseIntakeDate = (intakeStr) => {
    if (!intakeStr) return new Date(0);
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const parts = intakeStr.toLowerCase().trim().split(/\s+/);
    if (parts.length === 2) {
      const month = months[parts[0].substring(0, 3)] ?? 0;
      const year = parseInt(parts[1]) || 2025;
      return new Date(year, month, 1);
    }
    const yr = parseInt(intakeStr);
    if (yr) return new Date(yr, 0, 1);
    return new Date(0);
  };

  // --- REPORT AGGREGATIONS ---

  // 1. Revenue Forecast by Intake (Cash Flow Projection)
  const intakeData = useMemo(() => {
    const groups = {};
    activeStudents.forEach(s => {
      const intake = s.intake || 'Unspecified';
      if (!groups[intake]) {
        groups[intake] = { intake, studentCount: 0, totalLkr: 0, totalUsd: 0 };
      }
      groups[intake].studentCount += 1;
      groups[intake].totalLkr += parseFloat(s.expected_income_lkr) || 0;
      groups[intake].totalUsd += parseFloat(s.expected_income_usd) || 0;
    });

    return Object.values(groups).sort((a, b) => {
      if (a.intake === 'Unspecified') return 1;
      if (b.intake === 'Unspecified') return -1;
      return parseIntakeDate(a.intake) - parseIntakeDate(b.intake);
    });
  }, [activeStudents]);

  // 2. Consultant Pipeline & Performance Report
  const consultantData = useMemo(() => {
    const groups = {};
    activeStudents.forEach(s => {
      const consultantName = s.consultant?.name || 'Unassigned';
      if (!groups[consultantName]) {
        groups[consultantName] = { consultantName, studentCount: 0, totalLkr: 0, totalUsd: 0 };
      }
      groups[consultantName].studentCount += 1;
      groups[consultantName].totalLkr += parseFloat(s.expected_income_lkr) || 0;
      groups[consultantName].totalUsd += parseFloat(s.expected_income_usd) || 0;
    });

    return Object.values(groups).sort((a, b) => b.totalUsd - a.totalUsd);
  }, [activeStudents]);

  // 3. Destination Country Trend Analysis
  const countryData = useMemo(() => {
    const groups = {};
    activeStudents.forEach(s => {
      const country = s.destination || 'Unspecified';
      if (!groups[country]) {
        groups[country] = { country, studentCount: 0, totalLkr: 0, totalUsd: 0 };
      }
      groups[country].studentCount += 1;
      groups[country].totalLkr += parseFloat(s.expected_income_lkr) || 0;
      groups[country].totalUsd += parseFloat(s.expected_income_usd) || 0;
    });

    const totalCountriesCount = Object.values(groups).reduce((sum, g) => sum + g.studentCount, 0);

    return Object.values(groups)
      .map(g => ({
        ...g,
        percentage: totalCountriesCount > 0 ? ((g.studentCount / totalCountriesCount) * 100) : 0
      }))
      .sort((a, b) => b.studentCount - a.studentCount);
  }, [activeStudents]);

  // 4. University Partnership Yield
  const universityData = useMemo(() => {
    const groups = {};
    activeStudents.forEach(s => {
      let unis = [];
      if (Array.isArray(s.target_universities)) {
        unis = s.target_universities;
      } else if (typeof s.target_universities === 'string') {
        unis = s.target_universities.split(',').map(u => u.trim()).filter(Boolean);
      }
      if (unis.length === 0) {
        unis = ['Unspecified'];
      }

      [...new Set(unis)].forEach(uni => {
        if (!groups[uni]) {
          groups[uni] = { university: uni, studentCount: 0 };
        }
        groups[uni].studentCount += 1;
      });
    });

    const totalInterests = Object.values(groups).reduce((sum, g) => sum + g.studentCount, 0);

    return Object.values(groups)
      .map(g => ({
        ...g,
        percentage: totalInterests > 0 ? ((g.studentCount / totalInterests) * 100) : 0
      }))
      .sort((a, b) => b.studentCount - a.studentCount);
  }, [activeStudents]);

  // 5. Data Quality & Missing Financials (Action Report)
  const missingFinancialsStudents = useMemo(() => {
    return filteredStudents.filter(s => {
      const lkr = parseFloat(s.expected_income_lkr);
      const usd = s.expected_income_usd;
      // Missing if expected LKR = 0.00 or Expected USD is null/undefined/empty
      return (lkr === 0 || lkr === null || lkr === undefined) || (usd === null || usd === undefined || usd === '');
    });
  }, [filteredStudents]);

  const missingFinancialsSummary = useMemo(() => {
    const groups = {};
    missingFinancialsStudents.forEach(s => {
      const consultantName = s.consultant?.name || 'Unassigned';
      if (!groups[consultantName]) {
        groups[consultantName] = { consultantName, studentCount: 0 };
      }
      groups[consultantName].studentCount += 1;
    });
    return Object.values(groups).sort((a, b) => b.studentCount - a.studentCount);
  }, [missingFinancialsStudents]);

  // --- SAVE DIRECT EDITS ---
  const onCellValueChanged = async (params) => {
    const payload = {};
    // Parse value as float for financial fields
    if (params.colDef.field === 'expected_income_usd' || params.colDef.field === 'expected_income_lkr') {
      payload[params.colDef.field] = parseFloat(params.newValue) || 0;
    } else {
      payload[params.colDef.field] = params.newValue;
    }

    if (params.api) {
      params.api.showLoadingOverlay();
    }

    try {
      await axios.put(`/api/students/${params.data.id}`, payload);
      // Refresh local state immediately so cards and reports recalculate
      setStudents(prev => prev.map(s => 
        s.id === params.data.id 
          ? { ...s, [params.colDef.field]: payload[params.colDef.field] }
          : s
      ));
    } catch (err) {
      console.error("Failed to update student income details:", err);
      // Revert cell value visually on failure
      params.node.setDataValue(params.colDef.field, params.oldValue);
      alert("Failed to save value. Reverted changes.");
    } finally {
      if (params.api) {
        params.api.hideOverlay();
      }
    }
  };

  // --- COLUMN DEFINITIONS ---
  const masterColumnDefs = [
    { field: 'name', headerName: 'Student Name', flex: 1.2, sortable: true, filter: true },
    { field: 'student_id', headerName: 'ID', flex: 0.8, sortable: true, filter: true },
    { field: 'consultant.name', headerName: 'Consultant', flex: 1.2, sortable: true, filter: true },
    { field: 'target_universities', headerName: 'University', flex: 1.5, valueFormatter: params => Array.isArray(params.value) ? params.value.join(', ') : params.value, sortable: true, filter: true },
    { field: 'destination', headerName: 'Country', flex: 1, sortable: true, filter: true },
    { 
      field: 'expected_income_usd', 
      headerName: 'Expected USD', 
      flex: 1, 
      editable: true,
      valueParser: params => parseFloat(params.newValue) || 0,
      cellClass: 'cursor-pointer hover:bg-sky-500/5 font-semibold text-sky-600 dark:text-sky-400'
    },
    { 
      field: 'expected_income_lkr', 
      headerName: 'Expected LKR', 
      flex: 1, 
      editable: true,
      valueParser: params => parseFloat(params.newValue) || 0,
      cellClass: 'cursor-pointer hover:bg-teal-500/5 font-semibold text-teal-600 dark:text-teal-400'
    },
    { field: 'intake', headerName: 'Expected Timeframe', flex: 1.2, editable: true, cellClass: 'cursor-pointer hover:bg-amber-500/5' } 
  ];

  const dataQualityColumnDefs = [
    { field: 'name', headerName: 'Student Name', flex: 1.2, sortable: true, filter: true },
    { field: 'consultant.name', headerName: 'Consultant', flex: 1.2, sortable: true, filter: true },
    { field: 'destination', headerName: 'Country', flex: 1, sortable: true, filter: true },
    { field: 'intake', headerName: 'Intake Timeframe', flex: 1.2, sortable: true, filter: true },
    { 
      field: 'expected_income_usd', 
      headerName: 'Expected USD (Double Click)', 
      flex: 1.2, 
      editable: true,
      valueParser: params => parseFloat(params.newValue) || 0,
      cellClass: 'bg-orange-500/5 hover:bg-orange-500/10 cursor-pointer font-bold border-l-2 border-orange-500 text-orange-600 dark:text-orange-400'
    },
    { 
      field: 'expected_income_lkr', 
      headerName: 'Expected LKR (Double Click)', 
      flex: 1.2, 
      editable: true,
      valueParser: params => parseFloat(params.newValue) || 0,
      cellClass: 'bg-teal-500/5 hover:bg-teal-500/10 cursor-pointer font-bold border-l-2 border-teal-500 text-teal-600 dark:text-teal-400'
    }
  ];

  // --- DYNAMIC EXCEL EXPORTS (EXCELJS WITH EMBEDDED CHARTS) ---
  const handleExport = async () => {
    let headers = [];
    let rows = [];
    let filename = `SG_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    let sheetName = "Report";

    if (activeTab === 'master') {
      headers = [
        'Student Name',
        'ID',
        'Consultant',
        'University',
        'Country',
        'Expected USD',
        'Expected LKR',
        'Expected Timeframe',
        'Status'
      ];
      rows = filteredStudents.map(s => [
        s.name,
        s.student_id,
        s?.consultant?.name || 'Unassigned',
        Array.isArray(s.target_universities) ? s.target_universities.join(', ') : s.target_universities || '',
        s.destination || '',
        parseFloat(s.expected_income_usd) || 0,
        parseFloat(s.expected_income_lkr) || 0,
        s.intake || '',
        s.drop_out_flag ? 'Dropped Out' : 'Active'
      ]);
      sheetName = "All Financials";
      filename = `SG_All_Financials_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (activeTab === 'forecast') {
      headers = [
        'Expected Timeframe (Intake)',
        'Active Student Count',
        'Total Expected LKR',
        'Total Expected USD',
        'Average USD / Student'
      ];
      rows = intakeData.map(d => [
        d.intake,
        d.studentCount,
        d.totalLkr,
        d.totalUsd,
        d.studentCount > 0 ? (d.totalUsd / d.studentCount) : 0
      ]);
      sheetName = "Cash Flow Forecast";
      filename = `SG_Cash_Flow_Forecast_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (activeTab === 'consultant') {
      headers = [
        'Rank',
        'Consultant',
        'Student Count',
        'Total Expected USD',
        'Average USD / Student'
      ];
      rows = consultantData.map((d, idx) => [
        idx + 1,
        d.consultantName,
        d.studentCount,
        d.totalUsd,
        d.studentCount > 0 ? (d.totalUsd / d.studentCount) : 0
      ]);
      sheetName = "Consultant Pipeline";
      filename = `SG_Consultant_Pipeline_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (activeTab === 'country') {
      headers = [
        'Country',
        'Student Count',
        'Percentage (%)',
        'Total Expected LKR',
        'Total Expected USD'
      ];
      rows = countryData.map(d => [
        d.country,
        d.studentCount,
        parseFloat((d.percentage / 100).toFixed(4)),
        d.totalLkr,
        d.totalUsd
      ]);
      sheetName = "Country Share";
      filename = `SG_Country_Demand_Trends_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (activeTab === 'university') {
      headers = [
        'University',
        'Student Count',
        'Percentage (%)'
      ];
      rows = universityData.map(d => [
        d.university,
        d.studentCount,
        parseFloat((d.percentage / 100).toFixed(4))
      ]);
      sheetName = "Uni Yield";
      filename = `SG_University_Yield_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (activeTab === 'dataquality') {
      headers = [
        'Student Name',
        'ID',
        'Consultant',
        'Country',
        'Intake Timeframe',
        'Expected USD',
        'Expected LKR'
      ];
      rows = missingFinancialsStudents.map(s => [
        s.name,
        s.student_id,
        s?.consultant?.name || 'Unassigned',
        s.destination || '',
        s.intake || '',
        parseFloat(s.expected_income_usd) || 0,
        parseFloat(s.expected_income_lkr) || 0
      ]);
      sheetName = "Incomplete Records";
      filename = `SG_Missing_Financials_ActionList_${new Date().toISOString().slice(0, 10)}.xlsx`;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Title Banner
      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = "SG CRM - Financial Reports";
      titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF97316' } // Orange accent
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 35;

      worksheet.mergeCells('A2:D2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `${sheetName} (${new Date().toLocaleDateString()})`;
      subtitleCell.font = { name: 'Segoe UI', size: 10, italic: true };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 18;

      // Header row configuration
      const headerRowNumber = 4;
      const headerRow = worksheet.getRow(headerRowNumber);
      headerRow.values = headers;
      headerRow.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.height = 24;
      for (let i = 1; i <= headers.length; i++) {
        const cell = headerRow.getCell(i);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F2937' } // Charcoal
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Add Data Rows
      rows.forEach((rowData, idx) => {
        const addedRow = worksheet.addRow(rowData);
        addedRow.height = 20;
        addedRow.font = { name: 'Segoe UI', size: 10 };
        addedRow.values.forEach((_, cellIdx) => {
          const cell = addedRow.getCell(cellIdx + 1);
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        // Zebra striping
        if (idx % 2 === 1) {
          for (let i = 1; i <= rowData.length; i++) {
            addedRow.getCell(i).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            };
          }
        }
      });

      // Total Row for Forecast
      if (activeTab === 'forecast' && intakeData.length > 0) {
        const totalRow = worksheet.addRow([
          'Total Projection',
          intakeData.reduce((sum, d) => sum + d.studentCount, 0),
          intakeData.reduce((sum, d) => sum + d.totalLkr, 0),
          intakeData.reduce((sum, d) => sum + d.totalUsd, 0),
          ""
        ]);
        totalRow.font = { name: 'Segoe UI', size: 10, bold: true };
        totalRow.height = 22;
        for (let i = 1; i <= headers.length; i++) {
          const cell = totalRow.getCell(i);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      }

      // Format Numbers
      if (activeTab === 'master') {
        worksheet.getColumn(6).numFmt = '"$"#,##0.00';
        worksheet.getColumn(7).numFmt = '"LKR "#,##0.00';
      } else if (activeTab === 'forecast') {
        worksheet.getColumn(3).numFmt = '"LKR "#,##0.00';
        worksheet.getColumn(4).numFmt = '"$"#,##0.00';
        worksheet.getColumn(5).numFmt = '"$"#,##0.00';
      } else if (activeTab === 'consultant') {
        worksheet.getColumn(4).numFmt = '"$"#,##0.00';
        worksheet.getColumn(5).numFmt = '"$"#,##0.00';
      } else if (activeTab === 'country') {
        worksheet.getColumn(3).numFmt = '0.0%';
        worksheet.getColumn(4).numFmt = '"LKR "#,##0.00';
        worksheet.getColumn(5).numFmt = '"$"#,##0.00';
      } else if (activeTab === 'university') {
        worksheet.getColumn(3).numFmt = '0.0%';
      } else if (activeTab === 'dataquality') {
        worksheet.getColumn(6).numFmt = '"$"#,##0.00';
        worksheet.getColumn(7).numFmt = '"LKR "#,##0.00';
      }

      // Auto-fit Column Widths (basic approximation)
      worksheet.columns.forEach(col => {
        let maxLen = 0;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const valStr = cell.value ? String(cell.value) : '';
          if (valStr.length > maxLen) maxLen = valStr.length;
        });
        col.width = Math.max(maxLen + 4, 12);
      });

      // Embed Charts
      let activeChartRef = null;
      if (activeTab === 'forecast') activeChartRef = forecastChartRef;
      else if (activeTab === 'consultant') activeChartRef = consultantChartRef;
      else if (activeTab === 'country') activeChartRef = countryChartRef;
      else if (activeTab === 'university') activeChartRef = universityChartRef;

      const getChartInstance = (ref) => {
        if (!ref || !ref.current) return null;
        if (typeof ref.current.toBase64Image === 'function') return ref.current;
        if (ref.current.chart && typeof ref.current.chart.toBase64Image === 'function') return ref.current.chart;
        if (ref.current.canvas && typeof ref.current.canvas.toDataURL === 'function') {
          return { toBase64Image: () => ref.current.canvas.toDataURL('image/png') };
        }
        if (typeof ref.current.toDataURL === 'function') {
          return { toBase64Image: () => ref.current.toDataURL('image/png') };
        }
        return null;
      };

      const chartInstance = getChartInstance(activeChartRef);
      if (chartInstance) {
        try {
          const base64Image = chartInstance.toBase64Image();
          const cleanBase64 = base64Image.split(',')[1];
          
          const imageId = workbook.addImage({
            base64: cleanBase64,
            extension: 'png',
          });

          // Embed image slightly to the right of the table
          const startColNum = headers.length + 2; // Leave one blank column

          worksheet.addImage(imageId, {
            tl: { col: startColNum - 1, row: 3 },  // row 3 is Row 4 (0-indexed)
            br: { col: startColNum + 8, row: 20 }  // row 20 is Row 21 (0-indexed)
          });
        } catch (chartErr) {
          console.error("Error generating or embedding chart image in Excel:", chartErr);
        }
      }

      // Write Workbook to Buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (excelErr) {
      console.error("ExcelJS export execution failed:", excelErr);
      alert("Failed to export Excel. Please try again.");
    }
  };

  // --- CHART OPTIONS SETUP ---
  const chartTextAndGridStyles = {
    textColor: isDark ? '#E5E7EB' : '#374151',
    gridColor: isDark ? '#333333' : '#E5E7EB',
    titleColor: isDark ? '#F9FAFB' : '#111827',
    tooltipBg: isDark ? '#1E1E1E' : '#FFFFFF',
    tooltipText: isDark ? '#F3F4F6' : '#1F2937',
    tooltipBorder: isDark ? '#333333' : '#E5E7EB'
  };

  const getDoughnutOptions = (titleText) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: chartTextAndGridStyles.textColor,
          font: { family: 'Inter', size: 12 }
        }
      },
      title: {
        display: true,
        text: titleText,
        color: chartTextAndGridStyles.titleColor,
        font: { family: 'Inter', size: 15, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: chartTextAndGridStyles.tooltipBg,
        titleColor: chartTextAndGridStyles.tooltipText,
        bodyColor: chartTextAndGridStyles.textColor,
        borderColor: chartTextAndGridStyles.tooltipBorder,
        borderWidth: 1,
        padding: 12
      }
    }
  });

  // Navigation Tabs configuration
  const tabs = [
    { id: 'master', label: 'Master Grid', desc: 'Raw records overview', icon: <MdTableChart /> },
    { id: 'forecast', label: 'Revenue Forecast', desc: 'Cash flow projection', icon: <MdTimeline /> },
    { id: 'consultant', label: 'Consultant Pipeline', desc: 'Performance leaderboard', icon: <MdLeaderboard /> },
    { id: 'country', label: 'Country Trends', desc: 'Destination share analysis', icon: <MdPublic /> },
    { id: 'university', label: 'University Yield', desc: 'Application volume share', icon: <MdSchool /> },
    { 
      id: 'dataquality', 
      label: 'Data Quality List', 
      desc: `${missingFinancialsStudents.length} entries missing financials`, 
      icon: <MdWarning />,
      badge: missingFinancialsStudents.length 
    }
  ];

  return (
    <div className="p-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex-1 flex flex-col min-h-0 overflow-y-auto">
      
      {/* Top Title Bar */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-teal-500 bg-clip-text text-transparent">Financial Reporting & Revenue Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Analyze, track, and optimize pipeline revenue yield and data quality integrity.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchStudents} 
            className="p-3 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors text-slate-600 dark:text-zinc-400"
            title="Refresh Data"
          >
            <MdRefresh className="text-xl" />
          </button>
          <button 
            onClick={handleExport} 
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg shadow-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer text-sm"
          >
            <MdFileDownload className="text-lg" />
            Export current view (Excel)
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="mb-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-4 shrink-0 shadow-sm text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Date Range Filter:</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select 
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="bg-slate-100 dark:bg-zinc-855 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg px-3 py-2 outline-none font-medium cursor-pointer text-slate-800 dark:text-zinc-200"
          >
            <option value="all">All Time</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
            <option value="this_semester">This Semester</option>
            <option value="this_tri_semester">This Tri-Semester</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg px-3 py-2 outline-none text-slate-700 dark:text-zinc-300 font-medium"
              />
              <span className="text-xs text-slate-400">to</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg px-3 py-2 outline-none text-slate-700 dark:text-zinc-300 font-medium"
              />
            </div>
          )}
        </div>
        
        <div className="ml-auto text-xs text-slate-500 dark:text-zinc-400 italic">
          Showing {filteredStudents.length} of {students.length} student files
        </div>
      </div>

      {/* Financial Metrics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-teal-500/10 border border-teal-200 dark:border-teal-900/40 p-5 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full -mr-8 -mt-8" />
          <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-2">Total Expected LKR</div>
          <div className="text-2xl font-black text-teal-700 dark:text-teal-400">
            LKR {totalRevenueLkr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-sky-500/10 border border-sky-200 dark:border-sky-900/40 p-5 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full -mr-8 -mt-8" />
          <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-2">Total Expected USD</div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-400">
            USD ${totalRevenueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-amber-500/10 border border-amber-200 dark:border-amber-900/40 p-5 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8" />
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Avg LKR Yield / Student</div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            LKR {averageRevenueLkr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-zinc-550/10 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full -mr-8 -mt-8" />
          <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Active Student Volume</div>
          <div className="text-2xl font-black">{activeStudentsCount}</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6 shrink-0">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 relative overflow-hidden group cursor-pointer ${
                isActive
                  ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-zinc-400'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
              <div className={`text-xl mb-1 transition-transform group-hover:scale-110 duration-200 ${isActive ? 'text-orange-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                {tab.icon}
              </div>
              <div className="text-xs font-bold leading-tight">{tab.label}</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 line-clamp-1 leading-none">{tab.desc}</div>
              {tab.badge > 0 && (
                <span className="absolute top-1 right-2 bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Panel Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col shadow-sm">
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-slate-400">Loading data analytics...</div>
          </div>
        ) : (
          <>
            {/* TAB 1: MASTER FINANCIALS GRID */}
            {activeTab === 'master' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4">
                  <h2 className="text-base font-bold">Master Financial Ledger</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Double-click expected income fields or timeframe in the grid to edit values directly.</p>
                </div>
                <div className={`${isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} w-full`} style={{ height: 'calc(100vh - 420px)', minHeight: '450px' }}>
                  <AgGridReact
                    rowData={filteredStudents}
                    columnDefs={masterColumnDefs}
                    defaultColDef={{ sortable: true, filter: true, resizable: true }}
                    onCellValueChanged={onCellValueChanged}
                    pagination={true}
                    paginationPageSize={20}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: REVENUE FORECAST (CASH FLOW PROJECTION) */}
            {activeTab === 'forecast' && (
              <div className="w-full flex flex-col gap-4">
                <div className="mb-2">
                  <h2 className="text-base font-bold">Revenue Forecast by Intake (Cash Flow Projection)</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Management cash flow projection aggregated chronologically by upcoming quarters.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Column: Visual Chart */}
                  <div className="lg:col-span-3 bg-slate-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col" style={{ height: '400px' }}>
                    <div className="flex-1 min-h-0 relative">
                      <Line
                        ref={forecastChartRef}
                        data={{
                          labels: intakeData.map(d => d.intake),
                          datasets: [
                            {
                              type: 'bar',
                              label: 'Expected LKR (Millions)',
                              data: intakeData.map(d => d.totalLkr / 1000000),
                              backgroundColor: 'rgba(20, 184, 166, 0.65)',
                              hoverBackgroundColor: 'rgba(20, 184, 166, 0.85)',
                              borderColor: '#14B8A6',
                              borderWidth: 1.5,
                              yAxisID: 'yLkr',
                              order: 2,
                              borderRadius: 4
                            },
                            {
                              type: 'line',
                              label: 'Expected USD (Thousands)',
                              data: intakeData.map(d => d.totalUsd / 1000),
                              borderColor: '#F97316',
                              backgroundColor: '#F97316',
                              borderWidth: 3,
                              tension: 0.25,
                              fill: false,
                              pointBackgroundColor: '#F97316',
                              yAxisID: 'yUsd',
                              order: 1
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              labels: { color: chartTextAndGridStyles.textColor, font: { family: 'Inter', size: 11 } }
                            },
                            tooltip: {
                              backgroundColor: chartTextAndGridStyles.tooltipBg,
                              titleColor: chartTextAndGridStyles.tooltipText,
                              bodyColor: chartTextAndGridStyles.textColor,
                              borderColor: chartTextAndGridStyles.tooltipBorder,
                              borderWidth: 1,
                              padding: 10,
                              callbacks: {
                                label: (context) => {
                                  const label = context.dataset.label || '';
                                  const val = context.parsed.y;
                                  if (context.datasetIndex === 0) {
                                    return `${label}: ${val.toFixed(2)}M LKR`;
                                  }
                                  return `${label}: $${val.toFixed(2)}k USD`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              grid: { color: chartTextAndGridStyles.gridColor },
                              ticks: { color: chartTextAndGridStyles.textColor, font: { family: 'Inter', size: 10 } }
                            },
                            yLkr: {
                              type: 'linear',
                              position: 'left',
                              title: { display: true, text: 'LKR (Millions)', color: chartTextAndGridStyles.textColor, font: { family: 'Inter', size: 11 } },
                              grid: { color: chartTextAndGridStyles.gridColor },
                              ticks: { color: chartTextAndGridStyles.textColor }
                            },
                            yUsd: {
                              type: 'linear',
                              position: 'right',
                              title: { display: true, text: 'USD (Thousands)', color: chartTextAndGridStyles.textColor, font: { family: 'Inter', size: 11 } },
                              grid: { drawOnChartArea: false },
                              ticks: { color: chartTextAndGridStyles.textColor }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Structured Table */}
                  <div className="lg:col-span-2 flex flex-col">
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-zinc-900/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-3">Intake Timeframe</th>
                            <th className="p-3 text-right">Students</th>
                            <th className="p-3 text-right">Expected LKR</th>
                            <th className="p-3 text-right">Expected USD</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                          {intakeData.map(d => (
                            <tr key={d.intake} className="hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3 font-semibold text-slate-700 dark:text-zinc-200">{d.intake}</td>
                              <td className="p-3 text-right font-semibold text-slate-600 dark:text-zinc-400">{d.studentCount}</td>
                              <td className="p-3 text-right text-teal-600 dark:text-teal-400 font-bold">LKR {d.totalLkr.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-bold">${d.totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))}
                          {intakeData.length === 0 && (
                            <tr>
                              <td colSpan="4" className="p-4 text-center text-slate-400 dark:text-zinc-500">No intake data available.</td>
                            </tr>
                          )}
                          <tr className="bg-slate-100 dark:bg-zinc-800/80 font-black sticky bottom-0 text-slate-900 dark:text-white border-t border-slate-350 dark:border-zinc-700">
                            <td className="p-3">Total Projection</td>
                            <td className="p-3 text-right">{intakeData.reduce((sum, d) => sum + d.studentCount, 0)}</td>
                            <td className="p-3 text-right text-teal-700 dark:text-teal-300">LKR {intakeData.reduce((sum, d) => sum + d.totalLkr, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="p-3 text-right text-sky-700 dark:text-sky-300">${intakeData.reduce((sum, d) => sum + d.totalUsd, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONSULTANT PIPELINE LEADERBOARD */}
            {activeTab === 'consultant' && (
              <div className="w-full flex flex-col gap-4">
                <div className="mb-2">
                  <h2 className="text-base font-bold">Consultant Pipeline & Performance Leaderboard</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Compare consultant workload volume and potential revenue in their pipelines.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Column: Leaderboard Chart */}
                  <div className="lg:col-span-3 bg-slate-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col" style={{ height: '400px' }}>
                    <div className="flex-1 min-h-0 relative">
                      <Bar
                        ref={consultantChartRef}
                        data={{
                          labels: consultantData.map(d => d.consultantName),
                          datasets: [
                            {
                              label: 'Expected USD Pipeline',
                              data: consultantData.map(d => d.totalUsd),
                              backgroundColor: 'rgba(249, 115, 22, 0.7)',
                              hoverBackgroundColor: 'rgba(249, 115, 22, 0.9)',
                              borderColor: '#F97316',
                              borderWidth: 1,
                              borderRadius: 4
                            }
                          ]
                        }}
                        options={{
                          indexAxis: 'y',
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: chartTextAndGridStyles.tooltipBg,
                              titleColor: chartTextAndGridStyles.tooltipText,
                              bodyColor: chartTextAndGridStyles.textColor,
                              borderColor: chartTextAndGridStyles.tooltipBorder,
                              borderWidth: 1,
                              padding: 10,
                              callbacks: {
                                label: (context) => `Expected USD: $${context.parsed.x.toLocaleString()}`
                              }
                            }
                          },
                          scales: {
                            x: {
                              grid: { color: chartTextAndGridStyles.gridColor },
                              ticks: { 
                                color: chartTextAndGridStyles.textColor,
                                font: { family: 'Inter' },
                                callback: value => '$' + value.toLocaleString() 
                              }
                            },
                            y: {
                              grid: { display: false },
                              ticks: { color: chartTextAndGridStyles.textColor, font: { family: 'Inter', size: 11 } }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Performance Ranking */}
                  <div className="lg:col-span-2 flex flex-col">
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-zinc-900/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-3">Rank</th>
                            <th className="p-3">Consultant</th>
                            <th className="p-3 text-right">Students</th>
                            <th className="p-3 text-right">Total Expected USD</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                          {consultantData.map((d, index) => {
                            let rankBadge = '';
                            if (index === 0) rankBadge = '🥇';
                            else if (index === 1) rankBadge = '🥈';
                            else if (index === 2) rankBadge = '🥉';
                            else rankBadge = `#${index + 1}`;

                            return (
                              <tr key={d.consultantName} className="hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                                <td className="p-3 font-bold text-center w-12">{rankBadge}</td>
                                <td className="p-3 font-semibold text-slate-700 dark:text-zinc-200">{d.consultantName}</td>
                                <td className="p-3 text-right font-medium text-slate-500 dark:text-zinc-400">{d.studentCount}</td>
                                <td className="p-3 text-right text-orange-600 dark:text-orange-400 font-bold">${d.totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              </tr>
                            );
                          })}
                          {consultantData.length === 0 && (
                            <tr>
                              <td colSpan="4" className="p-4 text-center text-slate-400 dark:text-zinc-500">No consultant records.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DESTINATION COUNTRY SHARE */}
            {activeTab === 'country' && (
              <div className="w-full flex flex-col gap-4">
                <div className="mb-2">
                  <h2 className="text-base font-bold">Destination Country Demand & Yield Trend Analysis</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Market share split of student destinations mapped against total revenue yields.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Column: Doughnut Chart */}
                  <div className="lg:col-span-2 bg-slate-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col" style={{ height: '400px' }}>
                    <div className="flex-1 min-h-0 relative">
                      <Doughnut
                        ref={countryChartRef}
                        data={{
                          labels: countryData.map(d => d.country),
                          datasets: [
                            {
                              label: 'Students Applied',
                              data: countryData.map(d => d.studentCount),
                              backgroundColor: [
                                '#F97316', // Orange
                                '#14B8A6', // Teal
                                '#3B82F6', // Blue
                                '#F59E0B', // Amber
                                '#8B5CF6', // Purple
                                '#F43F5E', // Rose
                                '#10B981', // Emerald
                                '#6B7280'  // Gray
                              ],
                              borderWidth: 1.5,
                              borderColor: isDark ? '#1E1E1E' : '#FFFFFF'
                            }
                          ]
                        }}
                        options={getDoughnutOptions('Pipeline Student Volume %')}
                      />
                    </div>
                  </div>

                  {/* Right Column: Country Breakdown Table */}
                  <div className="lg:col-span-3 flex flex-col">
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-zinc-900/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-3">Destination Country</th>
                            <th className="p-3 text-right">Students</th>
                            <th className="p-3 text-right">% Share</th>
                            <th className="p-3 text-right">Total expected LKR</th>
                            <th className="p-3 text-right">Total expected USD</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                          {countryData.map(d => (
                            <tr key={d.country} className="hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3 font-semibold text-slate-700 dark:text-zinc-200">{d.country}</td>
                              <td className="p-3 text-right font-medium text-slate-600 dark:text-zinc-400">{d.studentCount}</td>
                              <td className="p-3 text-right font-semibold text-indigo-500 dark:text-indigo-400">{d.percentage.toFixed(1)}%</td>
                              <td className="p-3 text-right text-teal-600 dark:text-teal-400 font-bold">LKR {d.totalLkr.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-bold">${d.totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))}
                          {countryData.length === 0 && (
                            <tr>
                              <td colSpan="5" className="p-4 text-center text-slate-400 dark:text-zinc-500">No country data.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: UNIVERSITY PARTNERSHIP YIELD */}
            {activeTab === 'university' && (
              <div className="w-full flex flex-col gap-4">
                <div className="mb-2">
                  <h2 className="text-base font-bold">University Partnership Yield & Volume Analysis</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Total student volumes routed to each university. High yield volume helps negotiate higher commissions.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Column: Top Universities Chart */}
                  <div className="lg:col-span-3 bg-slate-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col" style={{ height: '400px' }}>
                    <div className="flex-1 min-h-0 relative">
                      <Bar
                        ref={universityChartRef}
                        data={{
                          labels: universityData.slice(0, 10).map(d => d.university.length > 20 ? d.university.slice(0, 20) + '...' : d.university),
                          datasets: [
                            {
                              label: 'Student Volume (Applications)',
                              data: universityData.slice(0, 10).map(d => d.studentCount),
                              backgroundColor: 'rgba(59, 130, 246, 0.7)',
                              hoverBackgroundColor: 'rgba(59, 130, 246, 0.9)',
                              borderColor: '#3B82F6',
                              borderWidth: 1,
                              borderRadius: 4
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            title: {
                              display: true,
                              text: 'Top 10 Universities by Student Volume Yield',
                              color: chartTextAndGridStyles.titleColor,
                              font: { family: 'Inter', size: 13, weight: 'bold' }
                            },
                            tooltip: {
                              backgroundColor: chartTextAndGridStyles.tooltipBg,
                              titleColor: chartTextAndGridStyles.tooltipText,
                              bodyColor: chartTextAndGridStyles.textColor,
                              borderColor: chartTextAndGridStyles.tooltipBorder,
                              borderWidth: 1,
                              padding: 10
                            }
                          },
                          scales: {
                            x: {
                              grid: { display: false },
                              ticks: { color: chartTextAndGridStyles.textColor, font: { family: 'Inter', size: 9 }, maxRotation: 45, minRotation: 45 }
                            },
                            y: {
                              grid: { color: chartTextAndGridStyles.gridColor },
                              ticks: { color: chartTextAndGridStyles.textColor, stepSize: 1 }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Column: University Yield Table */}
                  <div className="lg:col-span-2 flex flex-col">
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-zinc-900/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-3">Partner Institution</th>
                            <th className="p-3 text-right">Student Volume</th>
                            <th className="p-3 text-right">% Interest Yield</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                          {universityData.map(d => (
                            <tr key={d.university} className="hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3 font-semibold text-slate-700 dark:text-zinc-200">{d.university}</td>
                              <td className="p-3 text-right font-bold text-orange-600 dark:text-orange-400">{d.studentCount}</td>
                              <td className="p-3 text-right font-medium text-slate-500 dark:text-zinc-400">{d.percentage.toFixed(1)}%</td>
                            </tr>
                          ))}
                          {universityData.length === 0 && (
                            <tr>
                              <td colSpan="3" className="p-4 text-center text-slate-400 dark:text-zinc-500">No university yield data.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: DATA QUALITY ACTION REPORT */}
            {activeTab === 'dataquality' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <MdWarning />
                    Incomplete Financials Action List
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Following students have missing financials (Expected LKR = 0.00 or Expected USD = null). Double-click values in the grid to resolve them. Corrected records automatically update reports.
                  </p>
                </div>

                {/* Consultant Audit Cards */}
                <div className="mb-4 bg-rose-500/5 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 p-4 rounded-xl shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-2">Outstanding Action Count by Consultant</h3>
                  <div className="flex flex-wrap gap-2">
                    {missingFinancialsSummary.map(c => (
                      <span 
                        key={c.consultantName} 
                        className="bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-350 border border-rose-200 dark:border-rose-950 shadow-sm flex items-center gap-2"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{c.consultantName}:</span>
                        <span className="bg-rose-500 text-white font-black px-1.5 py-0.5 rounded text-[10px]">{c.studentCount} missing</span>
                      </span>
                    ))}
                    {missingFinancialsSummary.length === 0 && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✨ Data Integrity is 100%! No missing financials found!</span>
                    )}
                  </div>
                </div>

                {/* Ag Grid Action List */}
                <div className={`${isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} w-full`} style={{ height: 'calc(100vh - 540px)', minHeight: '400px' }}>
                  <AgGridReact
                    rowData={missingFinancialsStudents}
                    columnDefs={dataQualityColumnDefs}
                    defaultColDef={{ sortable: true, filter: true, resizable: true }}
                    onCellValueChanged={onCellValueChanged}
                    pagination={true}
                    paginationPageSize={20}
                  />
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
