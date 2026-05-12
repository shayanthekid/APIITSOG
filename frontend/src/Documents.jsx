import React, { useState, useEffect, useRef } from 'react';
import { 
  MdFolder, MdInsertDriveFile, MdMoreVert, MdSearch, 
  MdCreateNewFolder, MdFileUpload, MdArrowBack, MdCloud,
  MdPeople, MdAccessTime, MdStarBorder, MdDeleteOutline,
  MdDownload, MdDelete, MdHistory, MdErrorOutline
} from 'react-icons/md';
import axios from './axios';

export default function Documents() {
  const [items, setItems] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'WorkDrive' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
        fetchItems(currentFolderId);
    }
  }, [currentFolderId]);

  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchQuery.trim() !== '') {
              setLoading(true);
              try {
                  const res = await axios.get('/api/workdrive/search', { params: { q: searchQuery } });
                  setItems(res.data);
              } catch (err) {
                  setError("Search failed.");
              } finally {
                  setLoading(false);
              }
          } else {
              fetchItems(currentFolderId);
          }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchItems = async (parentId) => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      
      // Virtual navigation logic
      if (parentId === 'students_root') {
          const studentRes = await axios.get('/api/students');
          data = studentRes.data.map(s => ({
              id: `student_${s.id}`,
              name: `${s.name} (${s.student_id})`,
              type: 'folder',
              author: s.counselor?.name || 'System',
              date: new Date(s.created_at).toLocaleDateString(),
              size: '--',
              is_virtual: true
          }));
      } else if (typeof parentId === 'string' && parentId.startsWith('student_')) {
          const studentId = parentId.split('_')[1];
          const studentRes = await axios.get(`/api/students/${studentId}`);
          const profileDocs = (studentRes.data.documents || []).map(doc => ({
              id: `doc_${doc.id}`,
              name: doc.file_name,
              type: 'file',
              author: studentRes.data.counselor?.name || 'System',
              date: new Date(doc.created_at).toLocaleDateString(),
              size: 'Unknown',
              real_doc_id: doc.id,
              is_student_doc: true,
              file_path: doc.file_path
          }));

          const wdRes = await axios.get(`/api/workdrive`, { params: { student_id: studentId } });
          const wdDocs = wdRes.data.map(item => ({
              ...item,
              author: item.user?.name || 'Unknown',
              date: new Date(item.created_at).toLocaleDateString(),
              size: item.file_size || '--'
          }));

          data = [...profileDocs, ...wdDocs];
      } else {
          // Real backend fetch for workdrive items
          const res = await axios.get(`/api/workdrive`, { params: { parent_id: parentId } });
          data = res.data.map(item => ({
              ...item,
              author: item.user?.name || 'Unknown',
              date: new Date(item.created_at).toLocaleDateString(),
              size: item.file_size || '--'
          }));

          // If we are at the very root, inject the "Student Files" virtual folder
          if (parentId === null) {
              data.unshift({
                  id: 'students_root',
                  name: 'Student Files',
                  type: 'folder',
                  author: 'System',
                  date: '-',
                  size: '--',
                  is_virtual: true
              });
          }
      }

      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError("Failed to load documents. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/api/workdrive/logs');
      setLogs(res.data);
      setShowLogs(true);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const navigateTo = (item) => {
    setSearchQuery('');
    setCurrentFolderId(item.id);
    setBreadcrumbs([...breadcrumbs, { id: item.id, name: item.name }]);
  };

  const handleBreadcrumbClick = (breadcrumb, index) => {
    setCurrentFolderId(breadcrumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const goBack = () => {
    if (breadcrumbs.length > 1) {
      const parent = breadcrumbs[breadcrumbs.length - 2];
      setCurrentFolderId(parent.id);
      setBreadcrumbs(breadcrumbs.slice(0, breadcrumbs.length - 1));
    }
  };

  const handleCreateFolder = async () => {
    if (typeof currentFolderId === 'string' && (currentFolderId === 'students_root' || currentFolderId.startsWith('student_'))) {
        setError("New folders cannot be created inside the automated Student Files structure.");
        return;
    }
    const name = prompt("Enter folder name:");
    if (!name) return;

    try {
      setLoading(true);
      await axios.post('/api/workdrive/folder', { name, parent_id: currentFolderId });
      fetchItems(currentFolderId);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create folder";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 20MB as per backend)
    if (file.size > 20 * 1024 * 1024) {
        setError("File is too large. Max size is 20MB.");
        e.target.value = null;
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // Only append parent_id if it's a real database ID (numeric)
    if (currentFolderId && !isNaN(currentFolderId)) {
        formData.append('parent_id', currentFolderId);
    }
    
    // If we are inside a student folder, link it
    if (typeof currentFolderId === 'string' && currentFolderId.startsWith('student_')) {
        const studentId = currentFolderId.split('_')[1];
        formData.append('student_id', studentId);
    }

    try {
      setLoading(true);
      setError(null);
      await axios.post('/api/workdrive/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchItems(currentFolderId);
    } catch (err) {
      const msg = err.response?.data?.message || "Upload failed. Ensure file type is allowed (PDF, Word, Images).";
      setError(msg);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleDelete = async (item) => {
    if (item.is_virtual || item.is_student_doc) {
        setError("System or student-linked folders/files cannot be deleted from here.");
        return;
    }
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return;

    try {
      setLoading(true);
      await axios.delete(`/api/workdrive/${item.id}`);
      fetchItems(currentFolderId);
    } catch (err) {
      setError("Failed to delete item.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item) => {
      if (item.is_student_doc) {
          window.open(`/storage/${item.file_path}`, '_blank');
          return;
      }

      try {
          if (!item.is_virtual) {
              const response = await axios.get(`/api/workdrive/${item.id}/download`, {
                  responseType: 'blob'
              });
              const url = window.URL.createObjectURL(response.data);
              const link = document.createElement('a');
              link.href = url;
              link.download = item.name;
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
          } else {
              setError("Download for this item is not available through this view.");
          }
      } catch (err) {
          setError("Download failed.");
      }
  };

  const filteredItems = items;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top action bar */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MdCloud className="text-blue-600" /> WorkDrive
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <MdSearch size={20} className="absolute left-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none w-64 transition-all"
            />
          </div>
          <button onClick={fetchLogs} className="p-2 text-slate-500 hover:text-blue-600 transition-colors" title="View History">
            <MdHistory size={24} />
          </button>
          <button onClick={handleCreateFolder} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <MdCreateNewFolder size={18} className="text-blue-600" /> New Folder
          </button>
          <div className="flex flex-col items-center">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <MdFileUpload size={18} /> Upload
              </button>
              <span className="text-[10px] text-slate-400 mt-1 font-normal">PDF, Word, Images (Max 20MB)</span>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col py-4 shrink-0">
          <div className="px-3 space-y-1">
            <button 
              onClick={() => { setCurrentFolderId(null); setBreadcrumbs([{ id: null, name: 'WorkDrive' }]); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentFolderId === null ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'}`}
            >
              <MdFolder size={20} className={currentFolderId === null ? 'text-blue-600' : 'text-slate-400'} />
              Team Folders
            </button>
            <button 
                onClick={() => { setCurrentFolderId('students_root'); setBreadcrumbs([{ id: null, name: 'WorkDrive' }, { id: 'students_root', name: 'Student Files' }]); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentFolderId === 'students_root' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'}`}
            >
              <MdPeople size={20} className={currentFolderId === 'students_root' ? 'text-blue-600' : 'text-slate-400'} />
              Student Files
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          {loading && <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center font-medium text-blue-600">Loading...</div>}
          
          {/* Error Banner */}
          {error && (
              <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                      <MdErrorOutline size={20} />
                      {error}
                  </div>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
              </div>
          )}

          {/* Breadcrumbs */}
          <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-100 bg-white shrink-0">
            {breadcrumbs.length > 1 && (
              <button onClick={goBack} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 mr-2 transition-colors">
                <MdArrowBack size={20} />
              </button>
            )}
            {breadcrumbs.map((b, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-slate-400">/</span>}
                <button 
                  onClick={() => handleBreadcrumbClick(b, index)}
                  className={`text-sm font-medium hover:underline ${index === breadcrumbs.length - 1 ? 'text-slate-800' : 'text-blue-600'}`}
                >
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* File Grid/List */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MdFolder size={64} className="mb-4 opacity-50" />
                <p className="text-lg font-medium text-slate-600">This folder is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-10">
                {filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => item.type === 'folder' ? navigateTo(item) : null}
                    className="group border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white flex flex-col justify-between h-32"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2.5 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors">
                        {item.type === 'folder' 
                          ? <MdFolder size={28} className="text-blue-500" />
                          : <MdInsertDriveFile size={28} className="text-amber-500" />
                        }
                      </div>
                      <div className="relative group/menu">
                          <button 
                            onClick={(e) => { e.stopPropagation(); }} 
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MdMoreVert size={20} />
                          </button>
                          <div className="hidden group-hover/menu:block absolute right-0 top-8 bg-white border border-slate-200 shadow-lg rounded-lg py-1 z-30 min-w-[120px]">
                              {item.type === 'file' && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><MdDownload /> Download</button>
                              )}
                              {!item.is_virtual && (
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><MdDelete /> Delete</button>
                              )}
                          </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 truncate" title={item.name}>{item.name}</h3>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>{item.date}</span>
                        <span className="truncate max-w-[50px]">{item.size !== '--' ? item.size : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* List View */}
            {filteredItems.length > 0 && (
              <div>
                 <h4 className="text-sm font-semibold text-slate-500 mb-3 border-b border-slate-100 pb-2">List View</h4>
                 <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium w-32">Owner</th>
                          <th className="px-4 py-3 font-medium w-32">Last Modified</th>
                          <th className="px-4 py-3 font-medium w-24">File Size</th>
                          <th className="px-4 py-3 w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredItems.map(item => (
                          <tr 
                            key={`list-${item.id}`}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => item.type === 'folder' ? navigateTo(item) : null}
                          >
                            <td className="px-4 py-3 flex items-center gap-3">
                              {item.type === 'folder' 
                                ? <MdFolder size={20} className="text-blue-500" />
                                : <MdInsertDriveFile size={20} className="text-amber-500" />
                              }
                              <span className="font-medium text-slate-800 truncate">{item.name}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 truncate">{item.author}</td>
                            <td className="px-4 py-3 text-slate-500 truncate">{item.date}</td>
                            <td className="px-4 py-3 text-slate-500 truncate">{item.size}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    {item.type === 'file' && <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} title="Download"><MdDownload size={18} className="text-blue-500 hover:text-blue-700" /></button>}
                                    {!item.is_virtual && <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title="Delete"><MdDelete size={18} className="text-red-400 hover:text-red-600" /></button>}
                                </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs Modal */}
      {showLogs && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                          <MdHistory size={24} className="text-blue-600" />
                          Activity History
                      </div>
                      <button onClick={() => setShowLogs(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-4">
                          {logs.length === 0 ? (
                              <p className="text-center text-slate-400 py-10">No activity recorded yet.</p>
                          ) : (
                              logs.map((log) => (
                                  <div key={log.id} className="flex gap-4 border-l-2 border-blue-200 pl-4 py-1">
                                      <div className="min-w-[140px] text-xs text-slate-400 mt-1">
                                          {new Date(log.created_at).toLocaleString()}
                                      </div>
                                      <div>
                                          <p className="text-sm font-semibold text-slate-800">
                                              {log.user?.name} <span className="font-normal text-slate-500">{log.description}</span>
                                          </p>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
