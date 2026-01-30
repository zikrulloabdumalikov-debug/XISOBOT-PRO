import React from 'react';
import { Task, Status } from '../../types';
import { MoreVertical, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { checkOverdue, formatDisplayDate } from '../../utils/dateUtils';

interface TaskColumnsProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const TaskCard: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  const isOverdue = checkOverdue(task.dedlayn, task.status) === "Ha";
  
  const priorityColor = {
    "Juda muhum": "bg-red-100 text-red-800",
    "Muhum": "bg-amber-100 text-amber-800",
    "Muhum emas": "bg-blue-100 text-blue-800",
  }[task.prioritet];

  return (
    <div 
      onClick={onClick}
      className="bg-white p-3 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer mb-3 group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${priorityColor}`}>
          {task.prioritet}
        </span>
        {isOverdue && (
           <span className="text-red-500" title="Dedlayn o'tgan">
             <AlertCircle size={16} />
           </span>
        )}
      </div>
      <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{task.vazifa}</h4>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.tavsif || "Tavsif yo'q"}</p>
      
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50 mt-2">
        <div className="flex items-center space-x-1">
          <CalendarIcon size={12} />
          <span>{formatDisplayDate(task.dedlayn)}</span>
        </div>
        <div className="font-medium text-teal-600">
           {Math.round(task.progress * 100)}%
        </div>
      </div>
    </div>
  );
};

export const TaskColumns: React.FC<TaskColumnsProps> = ({ tasks, onTaskClick }) => {
  const cols: { title: string; status: Status; color: string }[] = [
    { title: "Bajarilgan ishlar", status: "Bajarildi", color: "bg-green-50 border-green-200" },
    { title: "Jarayondagi ishlar", status: "Jarayonda", color: "bg-amber-50 border-amber-200" },
    { title: "Rejadagi ishlar", status: "Rejada", color: "bg-blue-50 border-blue-200" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cols.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        return (
          <div key={col.status} className={`rounded-lg border ${col.color} p-4 h-full min-h-[400px]`}>
            <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-gray-800">{col.title}</h3>
               <span className="bg-white text-gray-600 text-xs font-bold px-2 py-1 rounded shadow-sm">
                 {colTasks.length}
               </span>
            </div>
            <div className="space-y-2">
              {colTasks.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm italic">
                   Vazifalar yo'q
                </div>
              ) : (
                colTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};