import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from './axios';
import { 
  MdArrowBack, MdEmail, MdPhone, MdLocationOn, 
  MdSchool, MdAssignment, MdAttachMoney, MdPublic,
  MdDownload, MdEdit, MdChat
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`/api/students/${id}`)
      .then(res => setStudent(res.data))
      .catch(err => setError('Failed to load student profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading profile...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!student) return <div className="p-8 text-slate-500">Student not found.</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-h-0">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <button onClick={() => navigate(-1)} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <MdArrowBack /> Back to Pipeline
          </button>
          <span>/</span>
          <span className="text-slate-800 font-medium">Student Profile</span>
        </div>

        <div className="flex justify-between items-start">
          <div className="flex gap-5">
            <div className="w-20 h-20 bg-blue-100 text-blue-800 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${student.drop_out_flag ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {student.drop_out_flag ? 'Dropped Out' : 'Active'}
                </span>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200">
                  {student.student_id}
                </span>
              </div>
              <p className="text-slate-500 flex items-center gap-2 text-sm mt-2">
                <MdSchool size={16}/> {student.type} Student • {student.highest_qualification || 'No Qual Listed'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm">
              <MdEdit size={18}/> Edit Profile
            </button>
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm">
              <FaWhatsapp size={18}/> Message
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 flex gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column (Details) */}
        <div className="flex-[2] flex flex-col gap-6">
          
          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MdEmail/> Email Address</div>
                <div className="font-medium text-slate-800">{student.email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MdPhone/> Mobile Number</div>
                <div className="font-medium text-slate-800 flex items-center gap-2">
                  {student.phone || 'N/A'}
                  {student.is_whatsapp_enabled && <FaWhatsapp className="text-green-500" title="WhatsApp Enabled"/>}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MdLocationOn/> Home Address</div>
                <div className="font-medium text-slate-800">{student.address || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MdPublic/> Nationality</div>
                <div className="font-medium text-slate-800">{student.nationality || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MdAssignment/> Passport / ID</div>
                <div className="font-medium text-slate-800">{student.passport_number || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Academic Background */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Academic Details</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Highest Qualification</div>
                <div className="font-medium text-slate-800">{student.highest_qualification || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Previous Institution</div>
                <div className="font-medium text-slate-800">{student.institution || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">GPA / Results</div>
                <div className="font-medium text-slate-800">{student.gpa || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">English Proficiency</div>
                <div className="font-medium text-slate-800">
                  {student.english_proficiency ? `${student.english_proficiency} (Score: ${student.english_score || 'N/A'})` : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Target Degree</div>
                <div className="font-medium text-blue-700 bg-blue-50 px-2 py-1 inline-block rounded">{student.target_degree || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Target Destinations</div>
                <div className="font-medium text-slate-800">
                  {Array.isArray(student.target_countries) ? student.target_countries.join(', ') : 'N/A'}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500 mb-1">Preferred Universities</div>
                <div className="font-medium text-slate-800">
                  {Array.isArray(student.target_universities) ? student.target_universities.join(', ') : 'N/A'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Sidebar) */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Pipeline Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Pipeline Status</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Current Stage</div>
                <div className="font-bold text-lg text-blue-700">{student.current_stage || 'Inquiry'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Assigned Counselor</div>
                <div className="font-medium text-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                    {student.counselor?.name?.charAt(0) || 'U'}
                  </div>
                  {student.counselor?.name || 'Unassigned'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Lead Source</div>
                <div className="font-medium text-slate-800">{student.source} {student.campaign_name && `(${student.campaign_name})`}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <div className="text-xs text-slate-500 mb-1">Follow-up Due</div>
                <div className="font-semibold text-red-600">
                  {student.follow_up_due_date ? new Date(student.follow_up_due_date).toLocaleDateString() : 'Not Set'}
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Documents</h3>
              <button className="text-xs text-blue-600 font-medium hover:underline">+ Upload</button>
            </div>
            
            <div className="space-y-3">
              {student.documents && student.documents.length > 0 ? (
                student.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center">
                        <MdAttachMoney size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{doc.name}</div>
                        <div className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <MdDownload className="text-slate-400 hover:text-blue-600" size={20}/>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  No documents uploaded yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
