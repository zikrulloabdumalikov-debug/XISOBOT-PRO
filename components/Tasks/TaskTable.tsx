import React from 'react';
import { Task } from '../../types';
import { checkOverdue, formatDisplayDate } from '../../utils/dateUtils';
import { Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface TaskTableProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string | null; direction: 'asc' | 'desc' | null };
}

export const TaskTable: React.FC<TaskTableProps> = ({ tasks, onEdit, onDelete, onSort, sortConfig }) => {
  
  const Th = ({ label, sortKey, className = "" }: { label: string, sortKey?: string, className?: string }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none ${sortKey ? 'cursor-pointer hover:bg-gray-100' : ''} ${className}`}
        onClick={() => sortKey && onSort(sortKey)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          {sortKey && isActive && (
             <span className="ml-1">
               {sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />}
             </span>
          )}
          {sortKey && !isActive && <ArrowUpDown size={12} className="text-gray-300 ml-1" />}
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th label="ID" sortKey="id" />
              <Th label="Sana" sortKey="sana" />
              <Th label="Vazifa" sortKey="vazifa" />
              <Th label="Status" sortKey="status" />
              <Th label="Prioritet" sortKey="prioritet" />
              <Th label="Dedlayn" sortKey="dedlayn" />
              <Th label="Muddati o'tgan" sortKey="overdue" />
              <Th label="Jarayon" sortKey="progress" />
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-400 italic">Ma'lumot yo'q</td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isOverdue = checkOverdue(task.dedlayn, task.status) === "Ha";
                const statusStyles = {
                  "Rejada": "bg-blue-100 text-blue-800",
                  "Jarayonda": "bg-amber-100 text-amber-800",
                  "Bajarildi": "bg-green-100 text-green-800"
                }[task.status];
                
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{task.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDisplayDate(task.sana)}</td>
                    <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[200px]" title={task.vazifa}>{task.vazifa}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles}`}>{task.status}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{task.prioritet}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDisplayDate(task.dedlayn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                       {isOverdue ? <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">Ha</span> : <span className="text-gray-400">Yo'q</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-24">
                        <div className="text-xs text-gray-500 mb-1 text-right">{Math.round(task.progress * 100)}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${task.progress * 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      <div className="flex items-center justify-end space-x-3 relative z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEdit(task);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-900 bg-transparent hover:bg-blue-50 rounded-full transition-all active:scale-95 cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(task.id);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-900 bg-transparent hover:bg-red-50 rounded-full transition-all active:scale-95 cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};