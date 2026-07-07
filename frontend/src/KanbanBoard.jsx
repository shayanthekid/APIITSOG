import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const initialData = {
  tasks: {
    'task-1': { id: 'task-1', content: 'Jane Doe - UK (Follow up due)', isUrgent: true, dest: 'UK', initials: 'ML' },
    'task-2': { id: 'task-2', content: 'John Smith - Australia', isUrgent: false, dest: 'AU', initials: 'SJ' },
    'task-3': { id: 'task-3', content: 'Bathy Born - UK', isUrgent: false, dest: 'UK', initials: 'SJ' },
    'task-4': { id: 'task-4', content: 'Mark Smith - Canada', isUrgent: true, dest: 'CA', initials: 'ML' },
  },
  columns: {
    'column-1': { id: 'column-1', title: 'Inquiry', taskIds: ['task-1'] },
    'column-2': { id: 'column-2', title: 'Follow-up', taskIds: ['task-2'] },
    'column-3': { id: 'column-3', title: 'University Apps', taskIds: ['task-3', 'task-4'] },
    'column-4': { id: 'column-4', title: 'Payment', taskIds: [] },
    'column-5': { id: 'column-5', title: 'Visa Application', taskIds: [] },
    'column-6': { id: 'column-6', title: 'Visa Status', taskIds: [] },
  },
  columnOrder: ['column-1', 'column-2', 'column-3', 'column-4', 'column-5', 'column-6'],
};

export default function KanbanBoard() {
  const [data, setData] = useState(initialData);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...start, taskIds: newTaskIds };
      setData({ ...data, columns: { ...data.columns, [newColumn.id]: newColumn } });
      return;
    }

    // Moving between columns
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    setData({
      ...data,
      columns: { ...data.columns, [newStart.id]: newStart, [newFinish.id]: newFinish },
    });
    
    // Here, we would fire an API call to update the lead stage
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full">
      <div className="flex justify-end items-center mb-4">
        <div className="flex gap-2">
            <button className="bg-white border border-slate-300 text-sm px-4 py-2 rounded shadow-sm hover:bg-slate-50">Filter</button>
            <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded shadow-sm hover:bg-blue-700">+ New Lead</button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-x-auto gap-4 pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

            return (
              <div key={column.id} className="w-80 min-w-[320px] bg-slate-100/50 rounded-xl flex flex-col border border-slate-200">
                <div className="p-3 bg-white border-b border-slate-200 rounded-t-xl font-semibold flex justify-between items-center text-slate-700 shadow-sm">
                  {column.title} <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{tasks.length}</span>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 flex-1 overflow-y-auto transition-colors min-h-[150px] ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                    >
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg shadow-sm border ${task.isUrgent ? 'border-red-300' : 'border-slate-200'} p-4 mb-3 hover:shadow-md transition-shadow relative ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400 opacity-90' : ''}`}
                            >
                              {task.isUrgent && <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-lg"></div>}
                              
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.dest === 'UK' ? 'bg-blue-100 text-blue-800' : task.dest === 'AU' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{task.dest}</span>
                                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-semibold text-slate-600">{task.initials}</div>
                              </div>
                              <div className="font-medium text-slate-800 text-sm mb-2">{task.content}</div>
                              {task.isUrgent && <div className="text-xs text-red-600 font-semibold flex items-center gap-1">⚠ Action Overdue</div>}
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
