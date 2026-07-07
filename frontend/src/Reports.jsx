import React, { useState, useEffect } from 'react';
import axios from './axios';
import { AgGridReact } from 'ag-grid-react';
import * as XLSX from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/students')
      .then(res => setStudents(res.data))
      .catch(err => console.error("Error fetching students:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = students.reduce((sum, s) => sum + (parseFloat(s.expected_income_lkr) || 0), 0);

  const columnDefs = [
    { field: 'name', headerName: 'Student Name', flex: 1 },
    { field: 'student_id', headerName: 'ID', flex: 1 },
    { field: 'consultant.name', headerName: 'Consultant', flex: 1 },
    { field: 'target_universities', headerName: 'University', flex: 1 },
    { field: 'destination', headerName: 'Country', flex: 1 },
    { field: 'expected_income_usd', headerName: 'Expected USD', flex: 1 },
    { field: 'expected_income_lkr', headerName: 'Expected LKR', flex: 1 },
    { field: 'intake', headerName: 'Expected Timeframe', flex: 1 } // Using intake as timeframe
  ];

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
    XLSX.writeFile(wb, `SG_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex-grow">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="bg-teal-500/10 border border-teal-200 dark:border-teal-900/50 p-6 rounded-xl flex flex-col justify-between shadow-sm min-w-[300px]">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total Expected LKR Revenue</div>
          <div className="text-4xl font-bold text-teal-700 dark:text-teal-400">LKR {totalRevenue.toLocaleString()}</div>
        </div>
        <button onClick={exportExcel} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg shadow font-medium transition-colors">Export Everything (Excel)</button>
      </div>

      <div className="ag-theme-alpine-dark w-full" style={{ height: 'calc(100vh - 250px)' }}>
        <AgGridReact
          rowData={students}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
        />
      </div>
    </div>
  );
}
