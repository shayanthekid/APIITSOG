import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from './axios';
import { 
  MdArrowBack, MdAssignment, MdDownload, MdEdit, MdSave, MdClose, MdCheck,
  MdUpload, MdCheckCircle, MdCancel, MdWarning, MdHub, MdHourglassEmpty
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
const DOC_TYPES = ['Passport', 'Academic Records', 'Offer Letter', 'English Proficiency', 'Visa Documents', 'Student Declaration & Information Form'];

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error,    setError]    = useState('');
  const [saved,    setSaved]    = useState(false);
  const [editMode, setEditMode] = useState(initialEditMode);
  const [form,     setForm]     = useState({});

  const [graphOpen, setGraphOpen] = useState(false);
  const [activeDocType, setActiveDocType] = useState(null);
  const [reviewDoc, setReviewDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const res = await axios.get(`/api/students/${id}/notes`);
      setNotes(res.data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }, [id]);

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
    fetchNotes();
  }, [fetchStudent, fetchNotes]);

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

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Strict Validation: 20MB, allowed types
    const validFiles = files.filter(f => {
      const isValidType = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(f.type) || f.name.endsWith('.docx') || f.name.endsWith('.doc');
      const isValidSize = f.size <= 20 * 1024 * 1024; // 20MB
      if (!isValidType) alert(`${f.name} is an invalid format. Only PDF, JPG, PNG, DOCX allowed.`);
      if (!isValidSize) alert(`${f.name} exceeds 20MB limit.`);
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const data = new FormData();
    validFiles.forEach(file => {
      data.append('documents[]', file);
    });
    data.append('type', type);

    try {
      await axios.post(`/api/students/${id}/documents`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      fetchStudent(); // Refresh data to show new documents
    } catch (err) {
      console.error(err);
      alert('Failed to upload document.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = ''; // Reset input
      setActiveDocType(null);
    }
  };

  const handleUpdateDocStatus = async (docId, newStatus, reason = '') => {
    try {
      await axios.put(`/api/students/${id}/documents/${docId}/status`, {
        status: newStatus,
        rejection_reason: reason
      });
      fetchStudent();
      setReviewDoc(null);
      setRejectionReason('');
    } catch (err) {
      alert('Failed to update document status.');
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

  // Group latest documents by type
  const docsByType = {};
  if (student?.documents) {
    student.documents.forEach(doc => {
      if (!docsByType[doc.type] || docsByType[doc.type].version < doc.version) {
        docsByType[doc.type] = doc;
      }
    });
  }

  const getStatusColor = (status) => {
    if (status === 'Verified') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'Rejected') return 'text-red-600 bg-red-50 border-red-200';
    if (status === 'Uploaded') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-slate-500 bg-slate-50 border-slate-200';
  };

  const getStatusIcon = (status) => {
    if (status === 'Verified') return <MdCheckCircle />;
    if (status === 'Rejected') return <MdCancel />;
    if (status === 'Uploaded') return <MdHourglassEmpty />;
    return <MdWarning />;
  };

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
                {student.consultant?.name && <><span>•</span><span>Consultant: <strong>{student.consultant.name}</strong></span></>}
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
              {F('Remarks', 'remarks', 'textarea', null, 2)}
            </div>
          </Section>

          <Section title="Student Notes & Remarks History">
            <div className="space-y-4">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type a new note here..."
                  className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={async () => {
                    if (!newNote.trim()) return;
                    try {
                      await axios.post(`/api/students/${id}/notes`, { note_content: newNote });
                      setNewNote('');
                      fetchNotes();
                    } catch (e) {
                      console.error("Failed to add note", e);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors h-fit self-end"
                >
                  Add Note
                </button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                    <div className="flex justify-between items-center mb-1 text-[11px] text-slate-500 font-semibold">
                      <span>By: {note.author?.name || 'System'}</span>
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800 break-words">{note.note_content}</p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-slate-400 text-center text-xs py-4">No historical notes yet.</p>
                )}
              </div>
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
                onClick={() => setGraphOpen(true)} 
                className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-sm"
              >
                <MdHub size={14} /> Graph View
              </button>
            }
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => handleFileUpload(e, activeDocType)}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              multiple
            />
            {uploading && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Uploading {activeDocType}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {DOC_TYPES.map(type => {
                const doc = docsByType[type];
                if (doc) {
                  return (
                    <div key={type} className="flex flex-col p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-800">{type}</div>
                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(doc.status)}`}>
                          {getStatusIcon(doc.status)} {doc.status}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                            {doc.file_name.split('.').pop().toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-sm text-slate-700 truncate cursor-pointer hover:text-blue-600 hover:underline" onClick={() => handleDownload(doc)}>
                              {doc.file_name} <span className="text-[10px] text-slate-400 font-bold ml-1">v{doc.version}</span>
                            </div>
                            {doc.rejection_reason && doc.status === 'Rejected' && (
                              <div className="text-[10px] text-red-500 mt-0.5 font-medium">Reason: {doc.rejection_reason}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setActiveDocType(type); fileInputRef.current.click(); }}
                            className="text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 p-1.5 rounded" title="Upload new version"
                          >
                            <MdUpload size={18} />
                          </button>
                          {!editMode && doc.status === 'Uploaded' && (
                             <button onClick={() => setReviewDoc(doc)} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1.5 rounded hover:bg-blue-100 font-bold tracking-wide uppercase">Review</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                      <div className="text-sm font-semibold text-slate-500">{type}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-200">Not Uploaded</span>
                        <button 
                          onClick={() => { setActiveDocType(type); fileInputRef.current.click(); }}
                          className="text-xs flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-semibold shadow-sm"
                        >
                          <MdUpload size={14} /> Upload
                        </button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </Section>
        </div>
      </div>

      {/* Review Modal */}
      {reviewDoc && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Review Document</h3>
            <div className="mb-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{reviewDoc.type}</div>
              <div className="text-sm text-slate-800 font-medium break-all">{reviewDoc.file_name}</div>
              <div className="text-xs text-slate-400 mt-1">Version {reviewDoc.version}</div>
            </div>
            <div className="flex flex-col gap-3 mb-6">
              <button onClick={() => handleDownload(reviewDoc)} className="text-sm text-blue-600 hover:underline text-left font-medium flex items-center gap-2">
                <MdDownload /> Download / View File
              </button>
            </div>
            <div className="mb-6">
              <label className={LBL}>Rejection Reason (if rejecting)</label>
              <textarea 
                value={rejectionReason} 
                onChange={e => setRejectionReason(e.target.value)} 
                className={INP + ' resize-none mt-1 shadow-sm'} 
                rows={3}
                placeholder="Required for rejection..."
              />
            </div>
            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button onClick={() => { setReviewDoc(null); setRejectionReason(''); }} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleUpdateDocStatus(reviewDoc.id, 'Rejected', rejectionReason)} disabled={!rejectionReason.trim()} className="px-4 py-2 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 rounded-lg disabled:opacity-50 transition-colors">Reject</button>
              <button onClick={() => handleUpdateDocStatus(reviewDoc.id, 'Verified')} className="px-4 py-2 text-sm font-semibold bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors">Verify</button>
            </div>
          </div>
        </div>
      )}

      {/* Graph View Modal */}
      {graphOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-4 sm:p-10 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full h-full max-w-6xl shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setGraphOpen(false)} className="absolute top-6 right-6 z-20 w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-blue-900/40 border border-blue-400/30">
              <MdClose size={24} />
            </button>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md relative z-10">
              <button 
                onClick={() => setGraphOpen(false)} 
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-slate-700 shadow-sm"
              >
                <MdArrowBack size={18} /> Back to Profile
              </button>
              <div className="text-center flex-1">
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                  <MdHub className="text-blue-500" size={28} /> Obsidian-Style Document Graph
                </h2>
                <p className="text-slate-400 text-sm mt-1">Interactive visualization of student files</p>
              </div>
              <div className="w-32 hidden sm:block"></div> {/* Spacer for centering title */}
            </div>
            <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full" viewBox="-400 -300 800 600" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <marker id="arrow-verified" viewBox="0 0 10 10" refX="40" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
                  </marker>
                  <marker id="arrow-rejected" viewBox="0 0 10 10" refX="40" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                  </marker>
                  <marker id="arrow-uploaded" viewBox="0 0 10 10" refX="40" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                  </marker>
                  <marker id="arrow-missing" viewBox="0 0 10 10" refX="40" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                  </marker>
                  
                  {/* Glow filter */}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                
                {/* SVG Lines and Nodes drawn dynamically */}
                <g>
                  {DOC_TYPES.map((type, i) => {
                    const angle = (i / DOC_TYPES.length) * Math.PI * 2 - Math.PI / 2;
                    const r = 220; // radius
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    const doc = docsByType[type];
                    const status = doc ? doc.status : 'Missing';
                    const strokeColor = status === 'Verified' ? '#22c55e' : status === 'Rejected' ? '#ef4444' : status === 'Uploaded' ? '#3b82f6' : '#475569';
                    const marker = `url(#arrow-${status.toLowerCase()})`;
                    
                    return (
                      <g key={type}>
                        <line x1="0" y1="0" x2={x} y2={y} stroke={strokeColor} strokeWidth={doc ? "3" : "2"} strokeDasharray={doc ? "0" : "8,8"} opacity={doc ? 0.8 : 0.4} markerEnd={marker} />
                      </g>
                    );
                  })}
                  
                  {/* Center Node: Student */}
                  <g className="hover:scale-110 transition-transform duration-300 cursor-pointer">
                    <circle cx="0" cy="0" r="45" fill="#0f172a" stroke="#3b82f6" strokeWidth="4" filter="url(#glow)" />
                    <text x="0" y="-5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Student</text>
                    <text x="0" y="15" textAnchor="middle" fill="#94a3b8" fontSize="10">{student.student_id}</text>
                  </g>

                  {/* Peripheral Nodes: Document Types */}
                  {DOC_TYPES.map((type, i) => {
                    const angle = (i / DOC_TYPES.length) * Math.PI * 2 - Math.PI / 2;
                    const r = 220; // radius
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    const doc = docsByType[type];
                    const isUploaded = !!doc;
                    const fillColor = isUploaded ? (doc.status === 'Verified' ? '#14532d' : doc.status === 'Rejected' ? '#7f1d1d' : '#1e3a8a') : '#1e293b';
                    const strokeColor = isUploaded ? (doc.status === 'Verified' ? '#4ade80' : doc.status === 'Rejected' ? '#f87171' : '#60a5fa') : '#64748b';
                    
                    return (
                      <g key={type} transform={`translate(${x}, ${y})`} className="cursor-pointer hover:scale-110 transition-all duration-300" onClick={() => doc && handleDownload(doc)}>
                        <circle cx="0" cy="0" r="35" fill={fillColor} stroke={strokeColor} strokeWidth="3" filter={isUploaded ? "url(#glow)" : ""} />
                        
                        {/* Title text with background for readability */}
                        <rect x="-60" y="-62" width="120" height="20" fill="#0f172a" rx="10" opacity="0.8" />
                        <text x="0" y="-48" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700" letterSpacing="0.5">{type}</text>
                        
                        {isUploaded ? (
                          <>
                            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">v{doc.version}</text>
                            <rect x="-35" y="32" width="70" height="18" fill={fillColor} stroke={strokeColor} strokeWidth="1" rx="9" />
                            <text x="0" y="44" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">{doc.status}</text>
                          </>
                        ) : (
                          <>
                            <text x="0" y="8" textAnchor="middle" fill="#94a3b8" fontSize="24" fontWeight="bold">+</text>
                            <rect x="-35" y="32" width="70" height="18" fill="#1e293b" stroke="#64748b" strokeWidth="1" rx="9" />
                            <text x="0" y="44" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">Missing</text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
            <div className="bg-slate-900 border-t border-slate-800 p-4 text-center">
              <p className="text-slate-400 text-sm">Click on uploaded documents to view/download them.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
