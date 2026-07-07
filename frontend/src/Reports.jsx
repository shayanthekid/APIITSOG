import React, { useState, useEffect } from 'react';
import axios from './axios';
import { AgGridReact } from 'ag-grid-react';
import * as XLSX from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Recalculate metrics on changes
  const totalRevenueLkr = students.reduce((sum, s) => sum + (parseFloat(s.expected_income_lkr) || 0), 0);
  const totalRevenueUsd = students.reduce((sum, s) => sum + (parseFloat(s.expected_income_usd) || 0), 0);
  const activeStudentsCount = students.filter(s => !s.drop_out_flag).length;
  const averageRevenueLkr = students.length > 0 ? (totalRevenueLkr / students.length) : 0;

  const columnDefs = [
    { field: 'name', headerName: 'Student Name', flex: 1 },
    { field: 'student_id', headerName: 'ID', flex: 1 },
    { field: 'consultant.name', headerName: 'Consultant', flex: 1 },
    { field: 'target_universities', headerName: 'University', flex: 1 },
    { field: 'destination', headerName: 'Country', flex: 1 },
    { 
      field: 'expected_income_usd', 
      headerName: 'Expected USD', 
      flex: 1, 
      editable: true,
      valueParser: params => parseFloat(params.newValue) || 0
    },
    { 
      field: 'expected_income_lkr', 
      headerName: 'Expected LKR', 
      flex: 1, 
      editable: true,
      valueParser: params => parseFloat(params.newValue) || 0
    },
    { field: 'intake', headerName: 'Expected Timeframe', flex: 1 } 
  ];

  const onCellValueChanged = async (params) => {
    // Only send the specific changed field to avoid nested object issues
    const payload = {};
    payload[params.colDef.field] = parseFloat(params.newValue) || 0;

    try {
      await axios.put(`/api/students/${params.data.id}`, payload);
      
      // Update local state so totals recalculate immediately
      setStudents(prev => prev.map(s => 
        s.id === params.data.id 
          ? { ...s, [params.colDef.field]: payload[params.colDef.field] }
          : s
      ));
    } catch (err) {
      console.error("Failed to update student income details:", err);
      alert("Failed to save value. Please try again.");
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      'Student Name': s.name,
      'ID': s.student_id,
      'Consultant': s?.consultant?.name || '',
      'University': Array.isArray(s.target_universities) ? s.target_universities.join(', ') : s.target_universities,
      'Country': s.destination,
      'Expected USD': s.expected_income_usd,
      'Expected LKR': s.expected_income_lkr,
      'Expected Timeframe': s.intake
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, `SG_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex-1 flex flex-col min-h-0">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Financial Reporting & Revenue Projection</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Double-click expected income fields in the grid to edit values directly.</p>
        </div>
        <button onClick={exportExcel} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg shadow font-medium transition-colors">Export Everything (Excel)</button>
      </div>

      {/* Financial Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-teal-500/10 border border-teal-200 dark:border-teal-900/50 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total Expected LKR Revenue</div>
          <div className="text-3xl font-bold text-teal-700 dark:text-teal-400">LKR {totalRevenueLkr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="bg-sky-500/10 border border-sky-200 dark:border-sky-900/50 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total Expected USD Revenue</div>
          <div className="text-3xl font-bold text-sky-700 dark:text-sky-400">USD ${totalRevenueUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Average LKR Revenue / Lead</div>
          <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">LKR {averageRevenueLkr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="bg-zinc-500/10 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Active Student Count</div>
          <div className="text-3xl font-bold">{activeStudentsCount}</div>
        </div>
      </div>

      <div className="ag-theme-alpine-dark flex-1 min-h-0 w-full" style={{ height: 'calc(100vh - 350px)' }}>
        <AgGridReact
          rowData={students}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          onCellValueChanged={onCellValueChanged}
          pagination={true}
          paginationPageSize={20}
        />
      </div>
    </div>
  );
}
