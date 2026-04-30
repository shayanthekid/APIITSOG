import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  MdDashboard, MdPeople, MdTimeline, MdFolder, 
  MdAttachMoney, MdBarChart, MdPerson, MdSettings,
  MdSearch, MdAdd, MdDownload, MdUpload, MdVisibility, MdEdit, MdEmail, MdLogout, MdClose,
  MdCheckCircle, MdWarning, MdTableChart
} from 'react-icons/md';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([AllCommunityModule]);
import KanbanBoard from './KanbanBoard';
import Login from './Login';
import StudentProfile from './StudentProfile';
import axios, { clearToken, getToken } from './axios';

function Dashboard({ globalSearch, refreshTrigger, onExport }) {
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('crm_view_mode') || 'grid';
  });

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridApi, setGridApi] = useState(null);

  // Dropdown filter states
  const [countryFilter, setCountryFilter] = useState(() => localStorage.getItem('crm_filter_country') || '');
  const [counselorFilter, setCounselorFilter] = useState(() => localStorage.getItem('crm_filter_counselor') || '');
  const [typeFilter, setTypeFilter] = useState(() => localStorage.getItem('crm_filter_type') || '');
  const [stageFilter, setStageFilter] = useState(() => localStorage.getItem('crm_filter_stage') || '');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('crm_filter_status') || 'Active');
  const [myStudentsOnly, setMyStudentsOnly] = useState(() => localStorage.getItem('crm_filter_my_students') === 'true');

  useEffect(() => {
    localStorage.setItem('crm_filter_country', countryFilter);
    localStorage.setItem('crm_filter_counselor', counselorFilter);
    localStorage.setItem('crm_filter_type', typeFilter);
    localStorage.setItem('crm_filter_stage', stageFilter);
    localStorage.setItem('crm_filter_status', statusFilter);
    localStorage.setItem('crm_filter_my_students', myStudentsOnly);
  }, [countryFilter, counselorFilter, typeFilter, stageFilter, statusFilter, myStudentsOnly]);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/students')
      .then(res => setStudents(res.data))
      .catch(err => console.error("Error fetching students:", err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('crm_view_mode', mode);
  };

  const onGridReady = (params) => {
    setGridApi(params.api);
  };

  // Programmatic filtering via AG Grid API
  useEffect(() => {
    if (gridApi) {
      const filterModel = {};
      if (countryFilter) filterModel.destination = { type: 'equals', filter: countryFilter };
      if (counselorFilter) filterModel['counselor.name'] = { type: 'equals', filter: counselorFilter };
      if (typeFilter) filterModel.type = { type: 'equals', filter: typeFilter };
      if (stageFilter) filterModel.current_stage = { type: 'equals', filter: stageFilter };
      
      if (statusFilter === 'Active') {
        filterModel.drop_out_flag = { type: 'equals', filter: 'Active' };
      } else if (statusFilter === 'Dropped Out') {
        filterModel.drop_out_flag = { type: 'equals', filter: 'Dropped Out' };
      }
      
      gridApi.setFilterModel(filterModel);
    }
  }, [gridApi, countryFilter, counselorFilter, typeFilter, stageFilter, statusFilter, myStudentsOnly]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    editable: true, // Enables inline editing like Excel
    flex: 1,
    minWidth: 120,
  }), []);

  const onCellValueChanged = useCallback(async (params) => {
    // Determine the field to update. If it's a nested object like counselor.name, we shouldn't edit it directly via this simple endpoint without mapping to counselor_id.
    // For now, we allow updating the basic top-level fields.
    const field = params.colDef.field;
    if (field === 'counselor.name' || field === 'target_universities') {
       // Ignore complex relation updates for simple inline editing
       return; 
    }
    
    const updatedData = { [field]: params.newValue };
    
    // For the status column, translate back to boolean
    if (field === 'drop_out_flag') {
        updatedData[field] = params.newValue === 'Dropped Out';
    }

    try {
      await axios.put(`/api/students/${params.data.id}`, updatedData);
    } catch (e) {
      console.error('Failed to update student:', e);
      // Optional: Revert the cell value visually on failure
      params.node.setDataValue(field, params.oldValue);
    }
  }, []);

  const columnDefs = useMemo(() => [
    { field: 'student_id', headerName: 'Student ID', checkboxSelection: true, minWidth: 130, maxWidth: 150, editable: false },
    { 
      field: 'name', 
      headerName: 'Student Name', 
      minWidth: 170,
      cellRenderer: (params) => (
        <Link to={`/student/${params.data.id}`} className="text-blue-600 hover:text-blue-800 font-semibold hover:underline">
          {params.value}
        </Link>
      )
    },
    { field: 'type', headerName: 'Type', minWidth: 100 },
    { field: 'destination', headerName: 'Destination', minWidth: 120 },
    { field: 'intake', headerName: 'Intake', minWidth: 120 },
    { 
      field: 'target_universities', 
      headerName: 'Preferred University', 
      minWidth: 190,
      valueGetter: params => {
        const val = params.data.target_universities;
        if (!val) return '';
        if (Array.isArray(val)) return val.join(', ');
        return val;
      },
      valueSetter: params => {
        params.data.target_universities = params.newValue ? params.newValue.split(',').map(s => s.trim()) : [];
        return true;
      }
    },
    { field: 'preferred_program', headerName: 'Program', minWidth: 160 },
    { 
      field: 'current_stage', 
      headerName: 'Pipeline Stage', 
      minWidth: 160,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Inquiry', 'Follow-up', 'University Apps', 'Payment', 'Visa Application', 'Visa Status']
      },
      cellRenderer: (params) => {
        const val = params.value;
        if(!val) return null;
        let cls = 'bg-gray-100 text-gray-800';
        if (val.includes('Inquiry')) cls = 'bg-blue-50 text-blue-700';
        if (val.includes('Follow-up')) cls = 'bg-blue-100 text-blue-800';
        if (val.includes('Apps')) cls = 'bg-amber-100 text-amber-800';
        if (val.includes('Payment')) cls = 'bg-emerald-100 text-emerald-800';
        if (val.includes('Visa')) cls = 'bg-red-100 text-red-800';
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{val}</span>;
      }
    },
    { field: 'lead_status', headerName: 'Lead Status', minWidth: 130 },
    { 
      field: 'drop_out_flag', 
      headerName: 'Status', 
      minWidth: 110,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Active', 'Dropped Out'] },
      valueGetter: params => params.data.drop_out_flag ? 'Dropped Out' : 'Active',
      valueSetter: params => {
        params.data.drop_out_flag = params.newValue === 'Dropped Out';
        return true;
      },
      cellRenderer: (params) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${params.value === 'Dropped Out' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {params.value}
        </span>
      )
    },
    { field: 'counselor.name', headerName: 'Consultant', minWidth: 150, editable: false },
    { field: 'source', headerName: 'Lead Source', minWidth: 130 },
    { 
      field: 'last_contact_date', 
      headerName: 'Last Contact', 
      minWidth: 140, 
      filter: 'agDateColumnFilter',
      editable: false,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : ''
    },
    { 
      headerName: 'Actions', 
      minWidth: 110,
      maxWidth: 110,
      filter: false,
      floatingFilter: false,
      sortable: false,
      editable: false,
      cellRenderer: (params) => (
        <div className="flex gap-2 text-blue-600 cursor-pointer pt-2">
          <Link to={`/student/${params.data.id}`} title="View Profile"><MdVisibility size={18} className="hover:text-blue-800" /></Link>
          <Link to={`/student/${params.data.id}/edit`} title="Edit Student"><MdEdit size={18} className="hover:text-amber-600" /></Link>
          <MdEmail size={18} className="hover:text-green-600" title="Send Email" />
        </div>
      )
    }
  ], []);

  // Calculate metrics
  const totalLeads = students.length;
  const activeInquiries = students.filter(s => s.current_stage === 'Inquiry').length;
  const visaApps = students.filter(s => s.current_stage?.includes('Visa')).length;
  const apiitCount = students.filter(s => s.type === 'APIIT').length;
  const externalCount = students.filter(s => s.type === 'External').length;
  const mixApiit = totalLeads ? Math.round((apiitCount / totalLeads) * 100) : 0;
  const mixExternal = totalLeads ? Math.round((externalCount / totalLeads) * 100) : 0;
  const dropOutRate = totalLeads ? Math.round((students.filter(s => s.drop_out_flag).length / totalLeads) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col min-h-0">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 shrink-0">Key Performance Metrics</h2>
      <div className="grid grid-cols-5 gap-4 mb-8 shrink-0">
        <div className="bg-sky-100 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">TOTAL LEADS</div>
          <div className="text-4xl font-bold text-slate-800 flex items-baseline gap-2">{totalLeads}</div>
        </div>
        <div className="bg-green-100 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ACTIVE INQUIRIES</div>
          <div className="text-4xl font-bold text-slate-800 flex items-baseline gap-2">{activeInquiries}</div>
        </div>
        <div className="bg-amber-100 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">VISA STAGES</div>
          <div className="text-4xl font-bold text-slate-800 flex items-baseline gap-2">{visaApps} <span className="text-lg">⏳</span></div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl flex items-center justify-center text-center shadow-sm text-sm">
           <div><strong className="text-slate-800">Student Mix</strong><br/><span className="text-blue-600">{mixApiit}% APIIT</span><br/><span className="text-red-700">{mixExternal}% External</span></div>
        </div>
        <div className="bg-red-100 p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">DROP OUT RATE</div>
          <div className="text-4xl font-bold text-slate-800 flex items-baseline gap-2">{dropOutRate}%</div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-4 shrink-0">
        <h2 className="text-lg font-semibold text-slate-800">Student Management Pipeline</h2>
        <div className="flex items-center gap-3" id="dashboard-actions">
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button 
                onClick={() => handleViewChange('grid')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Data Grid
              </button>
              <button 
                onClick={() => handleViewChange('kanban')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Kanban Board
              </button>
            </div>
            <button onClick={onExport} className="border border-slate-300 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-slate-50 bg-white flex items-center gap-1.5"><MdDownload size={16}/>Export Excel</button>
        </div>
      </div>
      
      <div className="flex gap-3 mb-4 flex-wrap shrink-0">
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="">All Countries</option>
          <option value="UK">UK</option>
          <option value="Canada">Canada</option>
          <option value="Australia">Australia</option>
        </select>
        <select value={counselorFilter} onChange={e => setCounselorFilter(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="">All Counselors</option>
          <option value="Standard Counselor">Standard Counselor</option>
          <option value="Counselor Head User">Counselor Head User</option>
        </select>
        <label className="flex items-center gap-2 text-sm bg-white border border-slate-300 px-3 py-2 rounded-md cursor-pointer">
          <input type="checkbox" checked={myStudentsOnly} onChange={e => setMyStudentsOnly(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" /> My Students
        </label>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="">All Types</option>
          <option value="APIIT">APIIT</option>
          <option value="External">External</option>
        </select>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="">All Stages</option>
          <option value="Inquiry">Inquiry</option>
          <option value="Follow-up">Follow-up</option>
          <option value="University Apps">University Apps</option>
          <option value="Payment">Payment</option>
          <option value="Visa Application">Visa Application</option>
          <option value="Visa Status">Visa Status</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Dropped Out">Dropped Out</option>
        </select>
      </div>

      <div className="flex-1 min-h-[400px]">
        {viewMode === 'grid' ? (
          <div className="ag-theme-alpine border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500">Loading student records...</div>
            ) : (
              <AgGridReact
                  rowData={students}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  rowSelection="multiple"
                  headerHeight={50}
                  floatingFiltersHeight={40}
                  rowHeight={45}
                  quickFilterText={globalSearch}
                  onGridReady={onGridReady}
                  onCellValueChanged={onCellValueChanged}
              />
            )}
          </div>
        ) : (
          <div className="h-full w-full rounded-xl overflow-x-auto">
            <KanbanBoard />
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to} className={`px-5 py-3 flex items-center gap-3 text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white border-l-4 border-blue-500' : 'hover:bg-white/10 hover:text-white border-l-4 border-transparent'}`}>
      <Icon size={20} /> {children}
    </Link>
  );
}

function AddStudentModal({ isOpen, onClose, onAdd }) {
  const [mode, setMode] = useState('fast'); // 'fast' | 'advanced'
  const emptyFast = { name: '', phone: '', email: '', counselor_id: '', source: '', type: 'External', destination: '', intake: '', preferred_program: '', target_universities: '', lead_status: '' };
  const emptyAdv  = { ...emptyFast, address: '', level: '', dob: '', gender: '', nationality: 'Sri Lankan', passport_number: '', highest_qualification: '', institution: '', gpa: '', english_proficiency: '', english_score: '', remarks: '' };
  const [formData, setFormData] = useState(emptyFast);
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docFiles, setDocFiles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/counselors').then(res => setCounselors(res.data)).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    // When switching to advanced, ensure we have the advanced fields without wiping current ones
    if (mode === 'advanced') {
      setFormData(f => ({ ...emptyAdv, ...f }));
    }
  }, [mode]);

  if (!isOpen) return null;

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));
  const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white";
  const lbl = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'target_universities') {
          // If it's a string, convert to array format for backend coercion or just send as string if backend handles it
          data.append(key, formData[key]);
        } else {
          data.append(key, formData[key] === null ? '' : formData[key]);
        }
      });

      data.append('current_stage', 'Inquiry');
      
      if (docFiles.length > 0) {
        docFiles.forEach(file => {
          data.append('documents[]', file);
        });
      }

      const res = await axios.post('/api/students', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onAdd(res.data);
      onClose();
      setFormData(emptyFast);
      setDocFiles([]);
      setMode('fast');
    } catch (err) {
      console.error(err);
      alert('Failed to add student. Please check the form.');
    } finally { setLoading(false); }
  };

  const SOURCES    = ['Walk - in','Phone','Email','Facebook','WhatsApp','Openday','Expo','Other'];
  const COUNTRIES  = ['Australia','Canada','UK','USA','New Zealand','Other'];
  const LEVELS     = ['UG - Direct','UG - Transfer','PG','PG - Diploma'];
  const STATUSES   = ['Lead','Prospective','Future Lead','Junk','Need Time','Call','More details','Cannot contacted ever','No answer'];
  const INTAKES    = ['Jan 2025','May 2025','Sep 2025','Jan 2026','May 2026','Sep 2026'];
  const QUALS      = ['O-Levels','A-Levels','Bachelors Degree','Diploma','Foundation','Masters Degree'];
  const ENG_TESTS  = ['IELTS','TOEFL','PTE','Duolingo','Exempted'];
  const GENDERS    = ['Male','Female','Other'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Add New Student</h2>
            <p className="text-xs text-blue-200 mt-0.5">Select entry mode below</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white"><MdClose size={24} /></button>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={() => setMode('fast')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${mode === 'fast' ? 'text-blue-700 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            ⚡ Fast Add
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${mode === 'advanced' ? 'text-blue-700 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            📋 Advanced Add
          </button>
        </div>

        {mode === 'fast' && (
          <div className="px-5 pt-3 pb-1 bg-blue-50 border-b border-blue-100 shrink-0">
            <p className="text-xs text-blue-700">⚡ <strong>Fast Add</strong> — capture essential details now. All other information can be completed from the student profile later.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* ── CORE FIELDS (both modes) ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Full Name <span className="text-red-500 normal-case font-normal">*</span></label>
              <input required type="text" value={formData.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="e.g. Dilshan Perera" />
            </div>
            <div>
              <label className={lbl}>Contact Number</label>
              <input type="text" value={formData.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="+94 77 123 4567" />
            </div>
            <div>
              <label className={lbl}>Email Address</label>
              <input type="email" value={formData.email} onChange={e => set('email', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Education Consultant</label>
              <select value={formData.counselor_id} onChange={e => set('counselor_id', e.target.value)} className={inp}>
                <option value="">Select consultant</option>
                {counselors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Lead Source</label>
              <select value={formData.source} onChange={e => set('source', e.target.value)} className={inp}>
                <option value="">Select source</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Student Type</label>
              <select value={formData.type} onChange={e => set('type', e.target.value)} className={inp}>
                <option value="External">Non-APIIT</option>
                <option value="APIIT">APIIT Alumni</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Lead Status</label>
              <select value={formData.lead_status} onChange={e => set('lead_status', e.target.value)} className={inp}>
                <option value="">Select status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Preferred Destination</label>
              <select value={formData.destination} onChange={e => set('destination', e.target.value)} className={inp}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Target Intake</label>
              <select value={formData.intake} onChange={e => set('intake', e.target.value)} className={inp}>
                <option value="">Select intake</option>
                {INTAKES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Preferred Program</label>
              <input type="text" value={formData.preferred_program} onChange={e => set('preferred_program', e.target.value)} className={inp} placeholder="e.g. Computer Science" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Preferred University</label>
              <input type="text" value={formData.target_universities} onChange={e => set('target_universities', e.target.value)} className={inp} placeholder="e.g. University of Manchester" />
            </div>
          </div>

          {/* ── ADVANCED FIELDS ── */}
          {mode === 'advanced' && (
            <>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">📍 Personal & Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Date of Birth</label>
                    <input type="date" value={formData.dob} onChange={e => set('dob', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Gender</label>
                    <select value={formData.gender} onChange={e => set('gender', e.target.value)} className={inp}>
                      <option value="">Select gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Nationality</label>
                    <input type="text" value={formData.nationality} onChange={e => set('nationality', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Passport / NIC Number</label>
                    <input type="text" value={formData.passport_number} onChange={e => set('passport_number', e.target.value)} className={inp} placeholder="N1234567" />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Residential Address</label>
                    <input type="text" value={formData.address} onChange={e => set('address', e.target.value)} className={inp} placeholder="Street, City, Sri Lanka" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">🎓 Academic Background</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Study Level</label>
                    <select value={formData.level} onChange={e => set('level', e.target.value)} className={inp}>
                      <option value="">Select level</option>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Highest Qualification</label>
                    <select value={formData.highest_qualification} onChange={e => set('highest_qualification', e.target.value)} className={inp}>
                      <option value="">Select qualification</option>
                      {QUALS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Previous Institution</label>
                    <input type="text" value={formData.institution} onChange={e => set('institution', e.target.value)} className={inp} placeholder="e.g. APIIT Lanka" />
                  </div>
                  <div>
                    <label className={lbl}>GPA / Final Result</label>
                    <input type="text" value={formData.gpa} onChange={e => set('gpa', e.target.value)} className={inp} placeholder="e.g. 3.5 / 4.0" />
                  </div>
                  <div>
                    <label className={lbl}>English Test</label>
                    <select value={formData.english_proficiency} onChange={e => set('english_proficiency', e.target.value)} className={inp}>
                      <option value="">Select test</option>
                      {ENG_TESTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Test Score / Band</label>
                    <input type="text" value={formData.english_score} onChange={e => set('english_score', e.target.value)} className={inp} placeholder="e.g. 6.5" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">📎 Documents (Max 7MB per file)</p>
                <div
                  onClick={() => document.getElementById('doc-upload-input').click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <p className="text-sm font-medium text-slate-600">
                    {docFiles.length > 0 ? `📁 ${docFiles.length} files selected` : 'Click to attach documents'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Passport copy, transcripts, certificates — PDF or image (PDF, JPG, PNG)</p>
                  <input 
                    id="doc-upload-input" 
                    type="file" 
                    className="hidden" 
                    multiple 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={e => {
                      const files = Array.from(e.target.files);
                      const validFiles = files.filter(f => {
                        const isValidType = ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type);
                        const isValidSize = f.size <= 7 * 1024 * 1024; // 7MB
                        if (!isValidType) alert(`${f.name} is not a PDF or image.`);
                        if (!isValidSize) alert(`${f.name} exceeds 7MB limit.`);
                        return isValidType && isValidSize;
                      });
                      setDocFiles(validFiles);
                    }} 
                  />
                </div>
                {docFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {docFiles.map((f, i) => (
                      <div key={i} className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> {f.name} ({(f.size/1024/1024).toFixed(2)} MB)
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">📌 More documents can be uploaded from the student profile after creation.</p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className={lbl}>Internal Remarks</label>
                <textarea rows={3} value={formData.remarks} onChange={e => set('remarks', e.target.value)} className={inp + " resize-none"} placeholder="Any notes for the team..." />
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
              {loading ? 'Saving...' : (mode === 'fast' ? '⚡ Add Student' : '📋 Save Full Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ isOpen, onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const reset = () => {
    setParsedRows([]);
    setFileName('');
    setResult(null);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        // Use the "Inquiries" sheet if present, else the first sheet
        const sheetName = wb.SheetNames.includes('Inquiries') ? 'Inquiries' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setParsedRows(rows);
      } catch (err) {
        setError('Failed to parse Excel file. Please use the SG Inquiries Sheet template.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!parsedRows.length) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/students/import', { rows: parsedRows });
      setResult(res.data);
      onImported();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed. Please check the file format.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Import from Excel</h2>
            <p className="text-xs text-slate-500 mt-0.5">Supports the SG Inquiries Sheet template</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600"><MdClose size={24} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <MdTableChart size={40} className="mx-auto text-blue-400 mb-3" />
            {fileName ? (
              <div>
                <p className="font-semibold text-slate-800">{fileName}</p>
                <p className="text-sm text-slate-500 mt-1">{parsedRows.length} rows detected from Inquiries sheet</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-700">Click to select an Excel file</p>
                <p className="text-sm text-slate-500 mt-1">.xlsx files in SG Inquiries Sheet format</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </div>

          {/* Preview table */}
          {parsedRows.length > 0 && !result && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              <div className="text-xs font-semibold text-slate-600 px-4 py-2 border-b border-slate-200 bg-white">Preview (first 5 rows)</div>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      {['Name','Education Consultant Name','Number','Source','Student Type','Preferred Country','Level','Lead Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-slate-600 whitespace-nowrap font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-slate-200">
                        {['Name','Education Consultant Name','Number','Source','Student Type','Prefferred Country','Level','Lead Status'].map(col => (
                          <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis">{row[col] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <MdCheckCircle size={22} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">{result.message}</p>
                {result.skipped > 0 && <p className="text-sm text-green-600 mt-1">{result.skipped} row(s) skipped (missing name).</p>}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <MdWarning size={22} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Close</button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!parsedRows.length || loading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Importing...' : `Import ${parsedRows.length} Record${parsedRows.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── App Content ───────────────────────────────────────────────────────────────
function AppContent({ user, onLogout }) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogoutClick = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      clearToken();
      onLogout();
    }
  };

  const handleExport = async (selectedIds) => {
    try {
      const params = selectedIds?.length ? `?ids=${selectedIds.join(',')}` : '';
      const res = await axios.get(`/api/students/export${params}`);
      const rows = res.data;
      if (!rows.length) { alert('No data to export.'); return; }

      const wb = XLSX.utils.book_new();

      // Sheet 1: Inquiries (main data)
      const ws = XLSX.utils.json_to_sheet(rows);
      // Column widths
      ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Inquiries');

      // Sheet 2: Data (dropdown reference)
      const dataRows = [
        { Source: 'Walk - in', Update: 'Interested', Outcome: 'Lead', 'Preferred Country': 'Australia', Level: 'UG - Direct', 'Visa Status': 'Received' },
        { Source: 'Phone', Update: 'Need Time', Outcome: 'Drop', 'Preferred Country': 'Canada', Level: 'UG - Transfer', 'Visa Status': 'Pending' },
        { Source: 'Email', Update: 'Not Interested', Outcome: '', 'Preferred Country': 'UK', Level: 'PG', 'Visa Status': 'Refused' },
        { Source: 'Facebook', Update: 'Other', Outcome: '', 'Preferred Country': 'USA', Level: 'PG - Diploma', 'Visa Status': '' },
        { Source: 'WhatsApp', Update: '', Outcome: '', 'Preferred Country': 'New Zealand', Level: '', 'Visa Status': '' },
        { Source: 'Openday', Update: '', Outcome: '', 'Preferred Country': 'Other', Level: '', 'Visa Status': '' },
        { Source: 'Expo', Update: '', Outcome: '', 'Preferred Country': '', Level: '', 'Visa Status': '' },
        { Source: 'Other', Update: '', Outcome: '', 'Preferred Country': '', Level: '', 'Visa Status': '' },
      ];
      const wsData = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, wsData, 'Data');

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `SG_Inquiries_Export_${date}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  return (
      <div className="flex h-screen overflow-hidden font-sans text-slate-800 bg-white">
        <aside className="w-[250px] bg-blue-900 text-blue-200 flex flex-col">
          <div className="p-5 border-b border-white/10 flex items-center gap-3 text-white font-bold text-lg">
            <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center text-[10px]">APIIT</div>
            Study Global
          </div>
          <nav className="flex flex-col py-3 flex-1 overflow-y-auto">
            <NavItem to="/" icon={MdDashboard}>Dashboard</NavItem>
            <NavItem to="/students" icon={MdPeople}>Students</NavItem>
            <NavItem to="/pipeline" icon={MdTimeline}>Pipeline</NavItem>
            <NavItem to="/documents" icon={MdFolder}>Documents</NavItem>
            <NavItem to="/finance" icon={MdAttachMoney}>Finance</NavItem>
            <NavItem to="/reports" icon={MdBarChart}>Reports</NavItem>
            <NavItem to="/counselors" icon={MdPerson}>Counselors</NavItem>
            <NavItem to="/settings" icon={MdSettings}>Settings</NavItem>
          </nav>
          
          <div className="p-4 border-t border-white/10 mt-auto">
            <button 
              onClick={handleLogoutClick}
              className="flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors w-full p-2 rounded hover:bg-white/10"
            >
              <MdLogout size={18} /> Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
            <div className="relative w-full max-w-lg">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Global Search (Name, ID, Passport, Phone)..." 
                className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 pl-10 pr-4 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm" 
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><MdAdd size={18} /> Add New Student</button>
              <button onClick={() => setIsImportModalOpen(true)} className="border border-slate-300 hover:bg-slate-50 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><MdUpload size={18} /> Import Excel</button>
              <div className="flex items-center gap-3 pl-5 ml-2 border-l border-slate-200">
                <div className="w-9 h-9 bg-blue-100 text-blue-800 flex items-center justify-center rounded-full font-bold uppercase">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="leading-tight">
                  <div className="font-semibold text-sm">{user?.name || 'User'}</div>
                  <div className="text-xs text-slate-500">{user?.role || 'Counselor'}</div>
                </div>
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<Dashboard globalSearch={globalSearch} refreshTrigger={refreshTrigger} onExport={handleExport} />} />
            <Route path="/pipeline" element={<Dashboard globalSearch={globalSearch} refreshTrigger={refreshTrigger} onExport={handleExport} />} />
            <Route path="/student/:id" element={<StudentProfile />} />
            <Route path="/student/:id/edit" element={<StudentProfile editMode={true} />} />
            <Route path="*" element={<div className="p-6">Feature in development...</div>} />
          </Routes>
          <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={() => setRefreshTrigger(prev => prev + 1)} />
          <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImported={() => { setRefreshTrigger(prev => prev + 1); }} />
        </main>
      </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    // Token exists — verify it's still valid
    axios.get('/api/user')
      .then(res => setUser(res.data))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  return (
    <Router>
      <AppContent user={user} onLogout={() => setUser(null)} />
    </Router>
  )
}

export default App;
