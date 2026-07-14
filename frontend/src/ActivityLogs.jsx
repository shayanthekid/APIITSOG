import React, { useState, useEffect } from 'react';
import axios from './axios';
import { Link } from 'react-router-dom';
import { MdHistory, MdFilterList } from 'react-icons/md';

export default function ActivityLogs({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [consultants, setConsultants] = useState([]);

  useEffect(() => {
    // Fetch consultants
    axios.get('/api/consultants')
      .then(res => setConsultants(res.data))
      .catch(err => console.error("Error fetching consultants:", err));

    // Fetch logs
    axios.get('/api/activity-logs')
      .then(res => {
        setLogs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching logs:", err);
        setLoading(false);
      });
  }, []);

  // Filter logs by selected consultant
  const filteredLogs = selectedConsultant
    ? logs.filter(log => log.user_id === parseInt(selectedConsultant))
    : logs;

  // Authorization Check: Head of School & Admin (Consultant Head) only
  if (user && user.role !== 'Consultant Head') {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl m-6 border border-red-200">
        <h2 className="text-lg font-bold mb-2">Access Denied</h2>
        <p className="text-sm">Only the Head of School and Administrators are authorized to view Consultant Activity Logs.</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MdHistory className="text-orange-500" /> Consultant Activity History
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm text-sm">
            <MdFilterList className="text-slate-400" />
            <span className="text-slate-500">Filter Consultant:</span>
            <select
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              className="outline-none bg-transparent font-semibold border-none cursor-pointer"
            >
              <option value="">All Consultants</option>
              {consultants.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-grow overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="p-4">Time</th>
                <th className="p-4">Consultant</th>
                <th className="p-4">Action</th>
                <th className="p-4">Description</th>
                <th className="p-4">Target Student</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-sm">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-zinc-300">
                    {log.user?.name || `User ID: ${log.user_id}`}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      log.action === 'update_student'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className={`p-4 font-mono text-xs max-w-lg break-words ${log.user?.role === 'Consultant Head' ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-zinc-300'}`}>
                    {log.description}
                  </td>
                  <td className="p-4">
                    {log.target_type === 'student' && log.target_id && (
                      <Link
                        to={`/student/${log.target_id}`}
                        className="text-orange-500 hover:text-orange-600 font-medium underline"
                      >
                        View Student #{log.target_id}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 dark:text-zinc-500">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
