import React, { useState, useEffect } from 'react';
import axios from './axios';
import { MdChevronLeft, MdChevronRight, MdEvent, MdAdd, MdClose } from 'react-icons/md';

export default function Calendar() {
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Event form states
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const [studentsRes, eventsRes] = await Promise.all([
        axios.get('/api/students'),
        axios.get('/api/calendar/events')
      ]);
      setStudents(studentsRes.data);
      setEvents(eventsRes.data);
    } catch (err) {
      console.error("Error loading calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= numberOfDays; d++) {
    days.push(new Date(year, month, d));
  }

  const getLocalDateStr = (d) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Get both student follow-ups AND custom events for a given day
  const getItemsForDate = (date) => {
    if (!date) return [];
    const dateStr = getLocalDateStr(date);
    
    // 1. Student follow-ups
    const studentFollowups = students
      .filter(s => s.follow_up_due_date && s.follow_up_due_date.slice(0, 10) === dateStr)
      .map(s => {
        const isOverdue = new Date(s.follow_up_due_date) < new Date() && !s.drop_out_flag;
        return {
          id: `student_${s.id}`,
          type: isOverdue ? 'overdue_deadline' : 'upcoming_deadline',
          title: `${s.name} - Stage Follow-up`,
          subtitle: s.current_stage,
          studentName: s.name,
          stage: s.current_stage
        };
      });

    // 2. Custom events
    const customEvents = events
      .filter(e => e.due_date && e.due_date.slice(0, 10) === dateStr)
      .map(e => {
        const isOverdue = new Date(e.due_date) < new Date() && (!e.drop_out_flag);
        return {
          id: `custom_${e.id}`,
          type: e.student_id ? (isOverdue ? 'overdue_deadline' : 'upcoming_deadline') : 'custom_event',
          title: e.title,
          subtitle: e.student_name ? `Student: ${e.student_name}` : 'General Event',
          studentName: e.student_name,
          stage: e.current_stage
        };
      });

    return [...studentFollowups, ...customEvents];
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleAddEventSubmit = async (e) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    try {
      await axios.post('/api/calendar/events', {
        title,
        due_date: dueDate,
        student_id: selectedStudent ? parseInt(selectedStudent) : null
      });
      setTitle('');
      setSelectedStudent('');
      setModalOpen(false);
      fetchCalendarData();
    } catch (err) {
      console.error("Failed to add event:", err);
      alert("Failed to add calendar event.");
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="p-6 flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MdEvent className="text-orange-500" /> Action & Deadline Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Track student milestones, follow-ups, and custom deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month controls */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
              <MdChevronLeft size={20} />
            </button>
            <span className="font-semibold px-2 min-w-[120px] text-center text-sm">
              {monthNames[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
              <MdChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <MdAdd size={18} /> Add Event
          </button>
        </div>
      </div>

      {/* Legend and Info */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 mb-6 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Legend:</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-teal-500 block"></span>
            <span>Upcoming Stage Deadlines</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-red-50 block"></span>
            <span>Overdue Stage Deadlines</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-purple-500 block"></span>
            <span>Meetings & General Events</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <span className="text-red-500 font-bold">*</span> Head of Department is notified for red overdue actions.
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className="grid grid-cols-7 flex-1 min-h-0 divide-x divide-y divide-slate-200 dark:divide-zinc-800 select-none overflow-y-auto">
          {days.map((date, idx) => {
            const items = getItemsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();

            return (
              <div 
                key={idx} 
                className={`min-h-[120px] p-2 flex flex-col gap-1 transition-colors ${
                  !date ? 'bg-slate-50/50 dark:bg-zinc-950/20' : 'bg-white dark:bg-zinc-900'
                } ${isToday ? 'bg-orange-500/10 dark:bg-orange-500/5' : ''}`}
                onClick={() => {
                  if (date) {
                    setDueDate(date.toISOString().slice(0, 10));
                    setModalOpen(true);
                  }
                }}
              >
                {date && (
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isToday ? 'bg-orange-500 text-white' : 'text-slate-500 dark:text-zinc-400'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1" onClick={e => e.stopPropagation()}>
                  {items.map(item => {
                    let borderClass = 'border-teal-200 dark:border-teal-900/50 bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400';
                    if (item.type === 'overdue_deadline') {
                      borderClass = 'border-red-200 dark:border-red-950/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-semibold';
                    } else if (item.type === 'custom_event') {
                      borderClass = 'border-purple-200 dark:border-purple-950/50 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400';
                    }

                    return (
                      <div 
                        key={item.id} 
                        className={`text-[10px] p-1.5 rounded border leading-tight ${borderClass}`}
                        title={`${item.title} - ${item.subtitle}`}
                      >
                        <div className="truncate font-semibold">{item.title}</div>
                        <div className="truncate opacity-75">{item.subtitle}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <MdClose size={22} />
            </button>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MdEvent className="text-orange-500" /> Add Calendar Event
            </h2>
            <form onSubmit={handleAddEventSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow-up meeting, Visa submission"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-slate-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 bg-white dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 bg-white dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase mb-1">Link to Student (Optional)</label>
                <select
                  value={selectedStudent}
                  onChange={e => setSelectedStudent(e.target.value)}
                  className="w-full border border-slate-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 bg-white dark:bg-zinc-950"
                >
                  <option value="">None (General Event)</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
