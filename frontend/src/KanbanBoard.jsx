import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import axios from './axios';

export default function KanbanBoard({ 
  students, 
  setStudents, 
  globalSearch, 
  countryFilter, 
  consultantFilter, 
  typeFilter, 
  stageFilter, 
  statusFilter, 
  myStudentsOnly,
  user,
  onAddNewLead
}) {
  const [boardData, setBoardData] = useState({ tasks: {}, columns: {}, columnOrder: [] });

  // Compute tasks and columns from filtered students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => {
      // 1. Global Search
      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const nameMatch = s.name?.toLowerCase().includes(q);
        const idMatch = s.student_id?.toLowerCase().includes(q);
        const phoneMatch = s.phone?.toLowerCase().includes(q);
        const passportMatch = s.passport_number?.toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !phoneMatch && !passportMatch) return false;
      }
      // 2. Country / Destination
      if (countryFilter && s.destination !== countryFilter) return false;
      // 3. Consultant
      if (consultantFilter && s.consultant?.name !== consultantFilter) return false;
      // 4. Type
      if (typeFilter && s.type !== typeFilter) return false;
      // 5. Stage
      if (stageFilter && s.current_stage !== stageFilter) return false;
      // 6. Status (Active vs Dropped Out)
      if (statusFilter === 'Active' && s.drop_out_flag) return false;
      if (statusFilter === 'Dropped Out' && !s.drop_out_flag) return false;
      // 7. Assigned to me only
      if (myStudentsOnly && user && s.consultant_id !== user.id) return false;

      return true;
    });
  }, [students, globalSearch, countryFilter, consultantFilter, typeFilter, stageFilter, statusFilter, myStudentsOnly, user]);

  // Sync boardData whenever filtered students change
  useEffect(() => {
    const tasksMap = {};
    const columnsMap = {
      'Inquiry': { id: 'Inquiry', title: 'Inquiry', taskIds: [] },
      'Follow-up': { id: 'Follow-up', title: 'Follow-up', taskIds: [] },
      'University Apps': { id: 'University Apps', title: 'University Apps', taskIds: [] },
      'Payment': { id: 'Payment', title: 'Payment', taskIds: [] },
      'Visa Application': { id: 'Visa Application', title: 'Visa Application', taskIds: [] },
      'Visa Status': { id: 'Visa Status', title: 'Visa Status', taskIds: [] },
    };

    filteredStudents.forEach(s => {
      const isOverdue = s.follow_up_due_date ? new Date(s.follow_up_due_date) < new Date(new Date().setHours(0,0,0,0)) : false;
      const initials = s.consultant?.name 
        ? s.consultant.name.split(' ').map(n => n[0]).join('').toUpperCase() 
        : 'U';
        
      tasksMap[s.id] = {
        id: s.id.toString(),
        student_id: s.student_id,
        content: `${s.name}`,
        isUrgent: isOverdue,
        dest: s.destination || 'Other',
        initials,
        consultantName: s.consultant?.name || 'Unassigned'
      };
      
      const stage = s.current_stage && columnsMap[s.current_stage] ? s.current_stage : 'Inquiry';
      columnsMap[stage].taskIds.push(s.id.toString());
    });

    setBoardData({
      tasks: tasksMap,
      columns: columnsMap,
      columnOrder: ['Inquiry', 'Follow-up', 'University Apps', 'Payment', 'Visa Application', 'Visa Status']
    });
  }, [filteredStudents]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = boardData.columns[source.droppableId];
    const finish = boardData.columns[destination.droppableId];

    const studentId = parseInt(draggableId);
    const newStage = destination.droppableId;

    // 1. Update local state immediately for visual responsiveness
    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...start, taskIds: newTaskIds };
      setBoardData(prev => ({
        ...prev,
        columns: { ...prev.columns, [newColumn.id]: newColumn }
      }));
      return;
    }

    // Moving between columns
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    setBoardData(prev => ({
      ...prev,
      columns: { ...prev.columns, [newStart.id]: newStart, [newFinish.id]: newFinish }
    }));

    // 2. Fire the API call and update the parent state in background
    try {
      await axios.put(`/api/students/${studentId}`, { current_stage: newStage });
      setStudents(prev => prev.map(s => 
        s.id === studentId ? { ...s, current_stage: newStage } : s
      ));
    } catch (err) {
      console.error("Failed to update student stage on drag:", err);
      alert("Failed to save stage change. Reverting drag.");
      // Trigger parent students list refresh to force local boardData reset
      setStudents(prev => [...prev]); 
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full">
      <div className="flex justify-end items-center mb-4 shrink-0">
        <div className="flex gap-2">
            <button onClick={onAddNewLead} className="bg-orange-500 text-white text-sm px-4 py-2 rounded shadow-sm hover:bg-orange-600 transition-colors">+ New Lead</button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-x-auto gap-4 pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          {boardData.columnOrder.map((columnId) => {
            const column = boardData.columns[columnId];
            if (!column) return null;
            const tasks = column.taskIds.map((taskId) => boardData.tasks[taskId]).filter(Boolean);

            return (
              <div key={column.id} className="w-80 min-w-[320px] bg-slate-100/50 dark:bg-zinc-900/50 rounded-xl flex flex-col border border-slate-200 dark:border-zinc-800">
                <div className="p-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 rounded-t-xl font-semibold flex justify-between items-center text-slate-700 dark:text-zinc-300 shadow-sm">
                  {column.title} <span className="bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full">{tasks.length}</span>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 flex-1 overflow-y-auto transition-colors min-h-[150px] ${snapshot.isDraggingOver ? 'bg-orange-500/10' : ''}`}
                    >
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white dark:bg-zinc-900 rounded-lg shadow-sm border ${task.isUrgent ? 'border-red-300 dark:border-red-900/50' : 'border-slate-200 dark:border-zinc-800'} p-4 mb-3 hover:shadow-md transition-shadow relative ${snapshot.isDragging ? 'shadow-lg ring-2 ring-orange-400 opacity-90' : ''}`}
                            >
                              {task.isUrgent && <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-lg"></div>}
                              
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.dest === 'UK' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' : task.dest === 'AU' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'}`}>{task.dest}</span>
                                <div className="w-6 h-6 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-zinc-400" title={`Consultant: ${task.consultantName}`}>{task.initials}</div>
                              </div>
                              <div className="font-semibold text-slate-850 dark:text-zinc-100 text-sm mb-1 hover:text-orange-500 transition-colors">
                                <Link to={`/student/${task.id}`}>{task.content}</Link>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mb-2">#{task.student_id}</div>
                              {task.isUrgent && <div className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">⚠ Action Overdue</div>}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </DragDropContext>
      </div>
    </div>
  );
}
