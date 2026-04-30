import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from './axios';
import { 
  MdArrowBack, MdEmail, MdPhone, MdLocationOn, 
  MdSchool, MdAssignment, MdAttachMoney, MdPublic,
  MdDownload, MdEdit, MdChat, MdSave, MdClose, MdCheck
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

const INP = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white";
const LBL = "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";

const STAGES   = ['Inquiry', 'Follow-up', 'University Apps', 'Payment', 'Visa Application', 'Visa Status'];
const SOURCES  = ['Walk - in','Phone','Email','Facebook','WhatsApp','Openday','Expo','Other'];
const COUNTRIES= ['Australia','Canada','UK','USA','New Zealand','Other'];
const LEVELS   = ['UG - Direct','UG - Transfer','PG','PG - Diploma'];
const QUALS    = ['O-Levels','A-Levels',"Bachelor's Degree",'Diploma','Foundation',"Master's Degree"];
const ENG_TESTS= ['IELTS','TOEFL','PTE','Duolingo','Exempted'];
const INTAKES  = ['Jan 2025','May 2025','Sep 2025','Jan 2026','May 2026','Sep 2026'];
const VISA_ST  = ['Pending','Approved','Rejected','Documents Requested'];
const STATUSES = ['Lead','Prospective','Future Lead','Junk','Need Time','Call','More details','Cannot contacted ever','No answer'];

export default function StudentProfile({ editMode: initialEditMode = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(initialEditMode);
  const [form, setForm] = useState({});

  useEffect(() => {
    axios.get(`/api/students/${id}`)
      .then(res => { setStudent(res.data); setForm(flattenStudent(res.data)); })
      .catch(() => setError('Failed to load student profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { setEditMode(initialEditMode); }, [initialEditMode]);

  const flattenStudent = (s) => ({
    name: s.name || '',
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
    nationality: s.nationality || '',
    passport_number: s.passport_number || '',
    dob: s.dob ? s.dob.split('T')[0] : '',
    gender: s.gender || '',
    type: s.type || 'External',
    intake: s.intake || '',
    preferred_program: s.preferred_program || '',
    destination: s.destination || '',
    level: s.level || '',
    lead_status: s.lead_status || '',
    current_stage: s.current_stage || 'Inquiry',
    visa_status: s.visa_status || '',
    source: s.source || '',
    highest_qualification: s.highest_qualification || '',
    institution: s.institution || '',
    gpa: s.gpa || '',
    english_proficiency: s.english_proficiency || '',
    english_score: s.english_score || '',
    target_universities: Array.isArray(s.target_universities) ? s.target_universities.join(', ') : (s.target_universities || ''),
    drop_out_flag: s.drop_out_flag || false,
    drop_out_reason: s.drop_out_reason || '',
    remarks: s.remarks || '',
    follow_up_due_date: s.follow_up_due_date ? s.follow_up_due_date.split('T')[0] : '',
    is_whatsapp_enabled: s.is_whatsapp_enabled || false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_universities: form.target_universities ? form.target_universities.split(',').map(s => s.trim()) : [],
      };
      const res = await axios.put(`/api/students/${id}`, payload);
      setStudent(res.data);
      setForm(flattenStudent(res.data));
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setForm(flattenStudent(student));
    setEditMode(false);
    if (initialEditMode) navigate(`/student/${id}`);
  };

  if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading profile...</div>;
  if (error)   return <div className="p-8 text-red-600">{error}</div>;
  if (!student) return <div className="p-8 text-slate-500">Student not found.</div>;

  const stageColors = {
    'Inquiry': 'bg-blue-50 text-blue-700',
    'Follow-up': 'bg-blue-100 text-blue-800',
    'University Apps': 'bg-amber-100 text-amber-800',
    'Payment': 'bg-emerald-100 text-emerald-800',
    'Visa Application': 'bg-red-100 text-red-800',
    'Visa Status': 'bg-purple-100 text-purple-800',
  };

  const Field = ({ label, field, type = 'text', options = null, span = 1 }) => (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <div className={LBL}>{label}</div>
      {editMode ? (
        options ? (
          <select value={form[field] || ''} onChange={e => set(field, e.target.value)} className={INP}>
            <option value="">— Select —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea rows={3} value={form[field] || ''} onChange={e => set(field, e.target.value)} className={INP + " resize-none"} />
        ) : (
          <input type={type} value={form[field] || ''} onChange={e => set(field, e.target.value)} className={INP} />
        )
      ) : (
        <div className="font-medium text-slate-800 text-sm py-1">{form[field] || <span className="text-slate-400 italic">Not set</span>}</div>
      )}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-h-0">
      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <MdCheck size={18} /> Profile saved successfully!
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <button onClick={() => navigate(-1)} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <MdArrowBack /> Back
          </button>
          <span>/</span>
          <span className="text-slate-800 font-medium">{editMode ? 'Edit Profile' : 'Student Profile'}</span>
        </div>

        <div className="flex justify-between items-start">
          <div className="flex gap-5 items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {editMode ? (
                  <input value={form.name} onChange={e => set('name', e.target.value)} className="text-2xl font-bold text-slate-800 border-b-2 border-blue-400 bg-transparent outline-none px-1" />
                ) : (
                  <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${student.drop_out_flag ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {student.drop_out_flag ? 'Dropped Out' : 'Active'}
                </span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200">{student.student_id}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                {editMode ? (
                  <select value={form.current_stage} onChange={e => set('current_stage', e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500">
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stageColors[student.current_stage] || 'bg-gray-100 text-gray-700'}`}>
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

      {/* Main Content */}
      <div className="p-6 flex gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column */}
        <div className="flex-[2] flex flex-col gap-5">

          {/* Contact Information */}
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Email Address" field="email" type="email" />
              <Field label="Mobile Number" field="phone" />
              <Field label="Nationality" field="nationality" />
              <Field label="Passport / NIC" field="passport_number" />
              <Field label="Date of Birth" field="dob" type="date" />
              <Field label="Gender" field="gender" options={['Male','Female','Other']} />
              <Field label="Address" field="address" span={2} />
            </div>
          </Section>

          {/* Study Preferences */}
          <Section title="Study Preferences">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Preferred Destination" field="destination" options={COUNTRIES} />
              <Field label="Target Intake" field="intake" options={INTAKES} />
              <Field label="Study Level" field="level" options={LEVELS} />
              <Field label="Student Type" field="type" options={['APIIT','External']} />
              <Field label="Preferred Program" field="preferred_program" span={2} />
              <Field label="Preferred University" field="target_universities" span={2} />
            </div>
          </Section>

          {/* Academic Background */}
          <Section title="Academic Background">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Highest Qualification" field="highest_qualification" options={QUALS} />
              <Field label="Previous Institution" field="institution" />
              <Field label="GPA / Final Result" field="gpa" />
              <Field label="English Test" field="english_proficiency" options={ENG_TESTS} />
              <Field label="English Score / Band" field="english_score" />
            </div>
          </Section>

          {/* Remarks */}
          <Section title="Internal Remarks">
            <Field label="Notes" field="remarks" type="textarea" span={2} />
          </Section>
        </div>

        {/* Right Sidebar */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Pipeline Status */}
          <Section title="Pipeline Status">
            <div className="space-y-4">
              <Field label="Lead Source" field="source" options={SOURCES} />
              <Field label="Lead Status" field="lead_status" options={STATUSES} />
              <Field label="Visa Status" field="visa_status" options={VISA_ST} />
              <Field label="Follow-up Due Date" field="follow_up_due_date" type="date" />
              {editMode && (
                <div>
                  <div className={LBL}>Drop Out</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.drop_out_flag} onChange={e => set('drop_out_flag', e.target.checked)} className="w-4 h-4 rounded text-red-600" />
                    <span className="text-sm text-slate-700">Mark as Dropped Out</span>
                  </label>
                  {form.drop_out_flag && <Field label="Drop Out Reason" field="drop_out_reason" type="textarea" />}
                </div>
              )}
            </div>
          </Section>

          {/* Documents */}
          <Section title="Documents" action={<button className="text-xs text-blue-600 font-semibold hover:underline">+ Upload</button>}>
            <div className="space-y-3">
              {student.documents && student.documents.length > 0 ? (
                student.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">PDF</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{doc.name}</div>
                        <div className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <MdDownload className="text-slate-400 hover:text-blue-600" size={20} />
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

function Section({ title, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
