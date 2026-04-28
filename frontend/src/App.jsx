import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  MdDashboard, MdPeople, MdTimeline, MdFolder, 
  MdAttachMoney, MdBarChart, MdPerson, MdSettings,
  MdSearch, MdAdd, MdDownload, MdVisibility, MdEdit, MdEmail, MdLogout
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

function Dashboard({ globalSearch }) {
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
    axios.get('/api/students')
      .then(res => setStudents(res.data))
      .catch(err => console.error("Error fetching students:", err))
      .finally(() => setLoading(false));
  }, []);

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
    { field: 'student_id', headerName: 'Student ID', checkboxSelection: true, minWidth: 140, maxWidth: 160, editable: false },
    { 
      field: 'name', 
      headerName: 'Student Name', 
      minWidth: 160,
      cellRenderer: (params) => (
        <Link to={`/student/${params.data.id}`} className="text-blue-600 hover:text-blue-800 font-semibold hover:underline">
          {params.value}
        </Link>
      )
    },
    { field: 'type', headerName: 'Type', minWidth: 110 },
    { field: 'destination', headerName: 'Destination', minWidth: 130 },
    { 
      field: 'target_universities', 
      headerName: 'Target University', 
      minWidth: 160,
      valueGetter: params => {
        const val = params.data.target_universities;
        if (!val) return '';
        if (Array.isArray(val)) return val.join(', ');
        return val;
      },
      valueSetter: params => {
        // If user types a comma separated list, convert it back to an array
        params.data.target_universities = params.newValue ? params.newValue.split(',').map(s => s.trim()) : [];
        return true;
      }
    },
    { 
      field: 'current_stage', 
      headerName: 'Current Stage', 
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
    { 
      field: 'drop_out_flag', 
      headerName: 'Status', 
      minWidth: 120,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Active', 'Dropped Out']
      },
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
    { field: 'counselor.name', headerName: 'Assigned Counselor', minWidth: 180, editable: false },
    { field: 'source', headerName: 'Lead Source', minWidth: 140 },
    { 
      field: 'last_contact_date', 
      headerName: 'Last Contact', 
      minWidth: 150, 
      filter: 'agDateColumnFilter',
      editable: false,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : ''
    },
    { 
      headerName: 'Actions', 
      minWidth: 100,
      maxWidth: 100,
      filter: false,
      floatingFilter: false,
      sortable: false,
      editable: false,
      cellRenderer: () => (
        <div className="flex gap-2 text-blue-600 cursor-pointer pt-2">
          <MdVisibility size={18} className="hover:text-blue-800" /> <MdEdit size={18} /> <MdEmail size={18} />
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
        <div className="flex items-center gap-3">
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
            <button className="border border-slate-300 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-slate-50 bg-white">Export</button>
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

function AppContent({ user, onLogout }) {
  const [globalSearch, setGlobalSearch] = useState('');

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
              <button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><MdAdd size={18} /> Add New Student</button>
              <button className="border border-slate-300 hover:bg-slate-50 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><MdDownload size={18} /> Import Data</button>
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
            <Route path="/" element={<Dashboard globalSearch={globalSearch} />} />
            <Route path="/pipeline" element={<Dashboard globalSearch={globalSearch} />} />
            <Route path="/student/:id" element={<StudentProfile />} />
            <Route path="*" element={<div className="p-6">Feature in development...</div>} />
          </Routes>
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
