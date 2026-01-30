import React, { useState } from 'react';
import { useTasks } from '../../context/TaskContext';
import { Button } from '../Shared/Button';
import { ConfirmModal } from '../Shared/ConfirmModal';
import { Trash2, RotateCcw, Trash, AlertCircle } from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';

export const TrashPage: React.FC = () => {
  const { deletedTasks, restoreTask, permanentlyDeleteTask, clearTrash } = useTasks();
  
  const [confirmState, setConfirmState] = useState<{
    type: 'single' | 'all';
    isOpen: boolean;
    taskId: string | null;
  }>({
    type: 'single',
    isOpen: false,
    taskId: null
  });

  const handlePermanentDeleteClick = (id: string) => {
    setConfirmState({ type: 'single', isOpen: true, taskId: id });
  };

  const handleClearTrashClick = () => {
    setConfirmState({ type: 'all', isOpen: true, taskId: null });
  };

  const handleConfirm = () => {
    if (confirmState.type === 'single' && confirmState.taskId) {
      permanentlyDeleteTask(confirmState.taskId);
    } else if (confirmState.type === 'all') {
      clearTrash();
    }
    setConfirmState({ ...confirmState, isOpen: false });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savat</h1>
          <p className="text-sm text-gray-500 mt-1">O'chirilgan vazifalar shu yerda vaqtinchalik saqlanadi.</p>
        </div>
        {deletedTasks.length > 0 && (
          <Button onClick={handleClearTrashClick} variant="danger" size="md">
            <Trash2 size={18} className="mr-2" />
            Savatni bo'shatish
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {deletedTasks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Trash size={48} className="mb-4 opacity-20" />
            <p className="text-lg">Savat bo'sh</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Vazifa</th>
                  <th className="px-6 py-4">Sana</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deletedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-500">{task.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{task.vazifa}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{task.tavsif}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDisplayDate(task.sana)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => restoreTask(task.id)}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Tiklash"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button 
                        onClick={() => handlePermanentDeleteClick(task.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Butunlay o'chirish"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
        <AlertCircle size={20} className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Eslatma:</strong> Savatdagi vazifalar haftalik hisobotlarda ko'rinmaydi. Ularni qayta tiklasangiz, ular o'zlarining avvalgi sanasi va statusi bilan asosiy ro'yxatga qaytadi.
        </p>
      </div>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={handleConfirm}
        title={confirmState.type === 'single' ? "Butunlay o'chirish" : "Savatni tozalash"}
        message={
          confirmState.type === 'single' 
            ? "Bu vazifani butunlay o'chirib yubormoqchimisiz? Qayta tiklashning imkoni bo'lmaydi." 
            : "Savatdagi barcha vazifalarni butunlay o'chirib yubormoqchimisiz?"
        }
        confirmText="O'chirib yuborish"
      />
    </div>
  );
};