import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from './axios';
import { 
  MdArrowBack, MdAssignment, MdDownload, MdEdit, MdSave, MdClose, MdCheck
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

// ─────────────────────────────────────────────────────────────────────────────
// Constants — defined at module level so they're stable references
// ─────────────────────────────────────────────────────────────────────────────
const STAGES   = ['Inquiry', 'Follow-up', 'University Apps', 'Payment', 'Visa Application', 'Visa Status'];
const SOURCES  = ['Walk - in','Phone','Email','Facebook','WhatsApp','Openday','Expo','Other'];
const COUNTRIES= ['Australia','Canada','UK','USA','New Zealand','Other'];
const LEVELS   = ['UG - Direct','UG - Transfer','PG','PG - Diploma'];
const QUALS    = ['O-Levels','A-Levels','Bachelors Degree','Diploma','Foundation','Masters Degree'];
const ENG_TESTS= ['IELTS','TOEFL','PTE','Duolingo','Exempted'];
const INTAKES  = ['Jan 2025','May 2025','Sep 2025','Jan 2026','May 2026','Sep 2026'];
const VISA_ST  = ['Pending','Approved','Rejected','Documents Requested'];
const STATUSES = ['Lead','Prospective','Future Lead','Junk','Need Time','Call','More details','Cannot contacted ever','No answer'];
const GENDERS  = ['Male','Female','Other'];

const INP = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white";
const LBL = "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";

const STAGE_COLORS = {
  'Inquiry':          'bg-blue-50 text-blue-700',
  'Follow-up':        'bg-blue-100 text-blue-800',
  'University Apps':  'bg-amber-100 text-amber-800',
  'Payment':          'bg-emerald-100 text-emerald-800',
  'Visa Application': 'bg-red-100 text-red-800',
  'Visa Status':      'bg-purple-100 text-purple-800',
};

// ─────────────────────────────────────────────────────────────────────────────
// Field — Stable component
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, fieldKey, type = 'text', options = null, span = 1, editMode, value, onChange }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <div className={LBL}>{label}</div>
      {editMode ? (
        options ? (
          <select value={value || ''} onChange={e => onChange(fieldKey, e.target.value)} className={INP}>
            <option value="">— Select —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            rows={3}
            value={value || ''}
            onChange={e => onChange(fieldKey, e.target.value)}
            className={INP + ' resize-none'}
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={e => onChange(fieldKey, e.target.value)}
            className={INP}
          />
        )
      ) : (
        <div className="font-medium text-slate-800 text-sm py-1">
          {value || <span className="text-slate-400 italic">Not set</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section — Stable component
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function flattenStudent(s) {
  return {
    name:                 s.name || '',
    email:                s.email || '',
    phone:                s.phone || '',
    address:              s.address || '',
    nationality:          s.nationality || '',
    passport_number:      s.passport_number || '',
    dob:                  s.dob ? s.dob.split('T')[0] : '',
    gender:               s.gender || '',
    type:                 s.type || 'External',
    intake:               s.intake || '',
    preferred_program:    s.preferred_program || '',
    destination:          s.destination || '',
    level:                s.level || '',
    lead_status:          s.lead_status || '',
    current_stage:        s.current_stage || 'Inquiry',
    visa_status:          s.visa_status || '',
    source:               s.source || '',
    highest_qualification: s.highest_qualification || '',
    institution:          s.institution || '',
    gpa:                  s.gpa || '',
    english_proficiency:  s.english_proficiency || '',
    english_score:        s.english_score || '',
    target_universities:  Array.isArray(s.target_universities)
      ? s.target_universities.join(', ')
      : (s.target_universities || ''),
    drop_out_flag:        s.drop_out_flag || false,
    drop_out_reason:      s.drop_out_reason || '',
    remarks:              s.remarks || '',
    follow_up_due_date:   s.follow_up_due_date ? s.follow_up_due_date.split('T')[0] : '',
    is_whatsapp_enabled:  s.is_whatsapp_enabled || false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentProfile({ editMode: initialEditMode = false }) {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const fileInputRef = useRef(null);

  const [student,  setStudent]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState('');
  const [saved,    setSaved]    = useState(false);
  const [editMode, setEditMode] = useState(initialEditMode);
  const [form,     setForm]     = useState({});

  const fetchStudent = useCallback(() => {
    setLoading(true);
    axios.get(`/api/students/${id}`)
      .then(res => { 
        setStudent(res.data); 
        setForm(flattenStudent(res.data)); 
      })
      .catch(() => setError('Failed to load student profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  useEffect(() => { setEditMode(initialEditMode); }, [initialEditMode]);

  const handleFieldChange = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_universities: form.target_universities
          ? form.target_universities.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };
      const res = await axios.put(`/api/students/${id}`, payload);
      setStudent(res.data);
      setForm(flattenStudent(res.data));
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setForm(flattenStudent(student));
    setEditMode(false);
    if (initialEditMode) navigate(`/student/${id}`);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Strict Validation
    const validFiles = files.filter(f => {
      const isValidType = ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type);
      const isValidSize = f.size <= 7 * 1024 * 1024; // 7MB
      if (!isValidType) alert(`${f.name} is not a PDF or image.`);
      if (!isValidSize) alert(`${f.name} exceeds 7MB limit.`);
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    const data = new FormData();
    validFiles.forEach(file => {
      data.append('documents[]', file);
    });
    data.append('type', 'Additional Document');

    try {
      await axios.post(`/api/students/${id}/documents`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchStudent(); // Refresh data to show new documents
    } catch (err) {
      console.error(err);
      alert('Failed to upload document(s).');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDownload = (doc) => {
    // Relative path works now because of Vite proxy for /storage
    window.open(`/storage/${doc.file_path}`, '_blank');
  };

  if (loading && !student) return <div className="p-8 flex justify-center text-slate-500">Loading profile...</div>;
  if (error)   return <div className="p-8 text-red-600">{error}</div>;
  if (!student) return <div className="p-8 text-slate-500">Student not found.</div>;

  const F = (label, fieldKey, type, options, span) => (
    <Field
      key={fieldKey}
      label={label}
      fieldKey={fieldKey}
      type={type}
      options={options}
      span={span}
      editMode={editMode}
      value={form[fieldKey]}
      onChange={handleFieldChange}
    />
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-h-0">

      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <MdCheck size={18} /> Profile saved successfully!
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <button onClick={() => navigate(-1)} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <MdArrowBack /> Back
          </button>
          <span>/</span>
          <span className="text-slate-800 font-medium">{editMode ? 'Edit Profile' : 'Student Profile'}</span>
        </div>

        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex gap-5 items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md shrink-0">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {editMode ? (
                  <input
                    value={form.name}
                    onChange={e => handleFieldChange('name', e.target.value)}
                    className="text-2xl font-bold text-slate-800 border-b-2 border-blue-400 bg-transparent outline-none px-1 min-w-[200px]"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${student.drop_out_flag ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {student.drop_out_flag ? 'Dropped Out' : 'Active'}
                </span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200">
                  {student.student_id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                {editMode ? (
                  <select
                    value={form.current_stage}
                    onChange={e => handleFieldChange('current_stage', e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[student.current_stage] || 'bg-gray-100 text-gray-700'}`}>
                    {student.current_stage || 'Inquiry'}
                  </span>
                )}
                <span>•</span>
                <span>{student.type} Student</span>
                {student.intake && <><span>•</span><span>Intake: <strong>{student.intake}</strong></span></>}
                {student.counselor?.name && <><span>•</span><span>Consultant: <strong>{student.counselor.name}</strong></span></>}
              </div>
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            {editMode ? (
              <>
                <button onClick={handleCancel} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm">
                  <MdClose size={16} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-60">
                  <MdSave size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm">
                  <MdEdit size={16} /> Edit Profile
                </button>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
                  <FaWhatsapp size={16} /> Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex gap-6 max-w-7xl mx-auto w-full flex-1">

        {/* Left Column */}
        <div className="flex-[2] flex flex-col gap-5">
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-5">
              {F('Email Address',   'email',          'email')}
              {F('Mobile Number',   'phone')}
              {F('Nationality',     'nationality')}
              {F('Passport / NIC',  'passport_number')}
              {F('Date of Birth',   'dob',            'date')}
              {F('Gender',          'gender',          'text', GENDERS)}
              {F('Address',         'address',         'text', null, 2)}
            </div>
          </Section>

          <Section title="Study Preferences">
            <div className="grid grid-cols-2 gap-5">
              {F('Preferred Destination', 'destination',       'text', COUNTRIES)}
              {F('Target Intake',         'intake',            'text', INTAKES)}
              {F('Study Level',           'level',             'text', LEVELS)}
              {F('Student Type',          'type',              'text', ['APIIT','External'])}
              {F('Preferred Program',     'preferred_program', 'text', null, 2)}
              {F('Preferred University',  'target_universities','text', null, 2)}
            </div>
          </Section>

          <Section title="Academic Background">
            <div className="grid grid-cols-2 gap-5">
              {F('Highest Qualification', 'highest_qualification', 'text', QUALS)}
              {F('Previous Institution',  'institution')}
              {F('GPA / Final Result',    'gpa')}
              {F('English Test',          'english_proficiency', 'text', ENG_TESTS)}
              {F('English Score / Band',  'english_score')}
            </div>
          </Section>

          <Section title="Internal Remarks">
            <div className="grid grid-cols-1 gap-5">
              {F('Notes', 'remarks', 'textarea', null, 2)}
            </div>
          </Section>
        </div>

        {/* Right Sidebar */}
        <div className="flex-1 flex flex-col gap-5">
          <Section title="Pipeline Status">
            <div className="space-y-4">
              {F('Lead Source',       'source',              'text', SOURCES)}
              {F('Lead Status',       'lead_status',         'text', STATUSES)}
              {F('Visa Status',       'visa_status',         'text', VISA_ST)}
              {F('Follow-up Due Date', 'follow_up_due_date',  'date')}

              {editMode && (
                <div>
                  <div className={LBL}>Drop Out</div>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={form.drop_out_flag}
                      onChange={e => handleFieldChange('drop_out_flag', e.target.checked)}
                      className="w-4 h-4 rounded text-red-600"
                    />
                    <span className="text-sm text-slate-700">Mark as Dropped Out</span>
                  </label>
                  {form.drop_out_flag && (
                    <div className="mt-2">
                      {F('Drop Out Reason', 'drop_out_reason', 'textarea')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section 
            title="Documents" 
            action={
              <button 
                onClick={() => fileInputRef.current.click()} 
                disabled={uploading}
                className="text-xs text-blue-600 font-semibold hover:underline disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : '+ Upload'}
              </button>
            }
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              multiple
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <div className="space-y-3">
              {student.documents && student.documents.length > 0 ? (
                student.documents.map(doc => (
                  <div 
                    key={doc.id} 
                    onClick={() => handleDownload(doc)}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                        {doc.file_name.split('.').pop().toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-semibold text-slate-800 truncate">{doc.file_name}</div>
                        <div className="text-[10px] text-slate-500">{doc.type} • {new Date(doc.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <MdDownload className="text-slate-400 hover:text-blue-600 shrink-0" size={20} />
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <MdAssignment size={24} className="mx-auto text-slate-300 mb-2" />
                  No documents uploaded yet.
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
