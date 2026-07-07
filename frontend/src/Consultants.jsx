import React, { useState, useEffect } from 'react';
import axios from './axios';
import { MdPerson, MdCheckCircle, MdCancel, MdTrendingUp } from 'react-icons/md';

export default function Consultants({ user }) {
  const [consultants, setConsultants] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [consultantsRes, studentsRes] = await Promise.all([
          axios.get('/api/consultants'),
          axios.get('/api/students')
        ]);
        setConsultants(consultantsRes.data);
        setStudents(studentsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Authorization Check: Head of School & Admin (Consultant Head) only
  if (user && user.role !== 'Consultant Head') {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 border rounded-xl m-6 border-red-200">
        <h2 className="text-lg font-bold mb-2">Access Denied</h2>
        <p className="text-sm">Only the Head of School and Administrators are authorized to view the Consultant Dashboard.</p>
      </div>
    );
  }

  // Calculate statistics per consultant
  const stats = consultants.map(consultant => {
    const consultantStudents = students.filter(s => s.consultant_id === consultant.id);
    const totalLeads = consultantStudents.length;
    const prospectiveLeads = consultantStudents.filter(s => s.lead_status === 'Prospective').length;
    const droppedLeads = consultantStudents.filter(s => s.drop_out_flag).length;
    const pendingLeads = consultantStudents.filter(s => s.lead_status !== 'Prospective' && !s.drop_out_flag).length;
    const conversionRate = totalLeads > 0 ? ((totalLeads - droppedLeads) / totalLeads * 100).toFixed(1) : '0.0';

    return {
      id: consultant.id,
      name: consultant.name,
      email: consultant.email,
      totalLeads,
      prospectiveLeads,
      pendingLeads,
      droppedLeads,
      conversionRate
    };
  });

  // Calculate overall school stats
  const totalSchoolLeads = students.length;
  const totalSchoolProspective = students.filter(s => s.lead_status === 'Prospective').length;
  const totalSchoolDropped = students.filter(s => s.drop_out_flag).length;
  const totalSchoolPending = students.filter(s => s.lead_status !== 'Prospective' && !s.drop_out_flag).length;
  const overallConversionRate = totalSchoolLeads > 0 ? ((totalSchoolLeads - totalSchoolDropped) / totalSchoolLeads * 100).toFixed(1) : '0.0';

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Consultant Dashboard...</div>;
  }

  return (
    <div className="p-6 flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MdPerson className="text-orange-500" /> Consultant & Head Dashboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Performance metrics, lead distributions, and conversion rates across consultants.
        </p>
      </div>

      {/* School-Wide Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-6 shrink-0">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total School Leads</div>
          <div className="text-3xl font-bold">{totalSchoolLeads}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">Prospective Leads</div>
          <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">{totalSchoolProspective}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pending Leads</div>
          <div className="text-3xl font-bold">{totalSchoolPending}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Dropped Students</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{totalSchoolDropped}</div>
        </div>
        <div className="bg-teal-500/10 border border-teal-200 dark:border-teal-900/50 p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <MdTrendingUp /> Overall Conversion
          </div>
          <div className="text-3xl font-bold text-teal-700 dark:text-teal-400">{overallConversionRate}%</div>
        </div>
      </div>

      {/* Consultants Details Table */}
      <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-grow overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="p-4">Consultant Name</th>
                <th className="p-4">Email</th>
                <th className="p-4 text-center">Total Leads</th>
                <th className="p-4 text-center">Prospective Leads</th>
                <th className="p-4 text-center">Pending Leads</th>
                <th className="p-4 text-center">Dropped Leads</th>
                <th className="p-4 text-center">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-sm">
              {stats.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-slate-800 dark:text-zinc-200">
                    {c.name}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-zinc-400">
                    {c.email}
                  </td>
                  <td className="p-4 text-center font-semibold">
                    {c.totalLeads}
                  </td>
                  <td className="p-4 text-center text-teal-600 dark:text-teal-400 font-semibold">
                    {c.prospectiveLeads}
                  </td>
                  <td className="p-4 text-center text-slate-600 dark:text-zinc-300">
                    {c.pendingLeads}
                  </td>
                  <td className="p-4 text-center text-red-500 dark:text-red-400">
                    {c.droppedLeads}
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-teal-500/10 text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-full font-bold text-xs">
                      {c.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No consultant performance records found.
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
