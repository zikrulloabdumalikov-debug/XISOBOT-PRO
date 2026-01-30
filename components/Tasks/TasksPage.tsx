import React, { useState, useMemo, useCallback } from 'react';
import { useTasks } from '../../context/TaskContext';
import { TaskTable } from './TaskTable';
import { Button } from '../Shared/Button';
import { Modal } from '../Shared/Modal';
import { TaskForm } from './TaskForm';
import { ConfirmModal } from '../Shared/ConfirmModal';
import { Task, Status, Priority } from '../../types';
import { Plus, Download, Filter } from 'lucide-react';
import { checkOverdue, getWeekRange, isDateInWeek } from '../../utils/dateUtils';
import { exportToExcel } from '../../utils/excelUtils';

export const TasksPage: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null
  });

  // Filters State
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
  const [filterPriority, setFilterPriority] = useState<Priority | 'All'>('All');
  const [filterOverdue, setFilterOverdue] = useState<'All' | 'Yes' | 'No'>('All');
  const [filterWeek, setFilterWeek] = useState<'All' | 'Current'>('All');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>({
    key: null,
    direction: null
  });

  // Sorting Handler
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        if (current.direction === 'desc') return { key: null, direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  // Filter and Sort Logic
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    const now = new Date();
    const { start, end } = getWeekRange(now);

    if (filterWeek === 'Current') {
        result = result.filter(t => isDateInWeek(t.sana, start, end));
    }
    if (filterStatus !== 'All') {
      result = result.filter(t => t.status === filterStatus);
    }
    if (filterPriority !== 'All') {
      result = result.filter(t => t.prioritet === filterPriority);
    }
    if (filterOverdue !== 'All') {
      result = result.filter(t => {
        const isOv = checkOverdue(t.dedlayn, t.status) === "Ha";
        return filterOverdue === 'Yes' ? isOv : !isOv;
      });
    }

    return result.sort((a, b) => {
      if (sortConfig.key && sortConfig.direction) {
        const { key, direction } = sortConfig;
        const modifier = direction === 'asc' ? 1 : -1;

        if (key === 'prioritet') {
           const pWeight = { "Juda muhum": 3, "Muhum": 2, "Muhum emas": 1 };
           const valA = pWeight[a.prioritet] || 0;
           const valB = pWeight[b.prioritet] || 0;
           return (valA - valB) * modifier;
        }
        
        const valA = (a as any)[key];
        const valB = (b as any)[key];

        if (typeof valA === 'string' && typeof valB === 'string') {
             return valA.localeCompare(valB) * modifier;
        }
        
        if (valA < valB) return -1 * modifier;
        if (valA > valB) return 1 * modifier;
        return 0;
      }
      return b.sana.localeCompare(a.sana);
    });
  }, [tasks, filterStatus, filterPriority, filterOverdue, filterWeek, sortConfig]);

  // Actions
  const handleOpenAdd = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmState({ isOpen: true, taskId: id });
  }, []);

  const handleConfirmDelete = () => {
    if (confirmState.taskId) {
      deleteTask(confirmState.taskId);
    }
    setConfirmState({ isOpen: false, taskId: null });
  };

  const handleSubmit = (data: Omit<Task, 'id'>) => {
    if (editingTask) {
      updateTask({ ...data, id: editingTask.id });
    } else {
      addTask(data);
    }
    setIsModalOpen(false);
  };

  const handleExport = () => {
    exportToExcel(filteredTasks);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Vazifalar Ro'yxati</h1>
           <p className="text-gray-500 text-sm mt-1">Jami {filteredTasks.length} ta vazifa ko'rsatilmoqda</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button onClick={handleExport} variant="secondary" className="bg-white flex-1 lg:flex-none justify-center">
            <Download size={18} className="mr-2 text-teal-700" />
            Excel
          </Button>
          <Button onClick={handleOpenAdd} className="shadow-md flex-1 lg:flex-none justify-center">
            <Plus size={18} className="mr-2" />
            Yangi Vazifa
          </Button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
            <Filter size={18} />
            <span>Filtrlash</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2.5"
                >
                    <option value="All">Barchasi</option>
                    <option value="Rejada">Rejada</option>
                    <option value="Jarayonda">Jarayonda</option>
                    <option value="Bajarildi">Bajarildi</option>
                </select>
            </div>
            {/* Other filters... same as before */}
             <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Prioritet</label>
                <select 
                    value={filterPriority} 
                    onChange={e => setFilterPriority(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2.5"
                >
                    <option value="All">Barchasi</option>
                    <option value="Juda muhum">Juda muhum</option>
                    <option value="Muhum">Muhum</option>
                    <option value="Muhum emas">Muhum emas</option>
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Dedlayn</label>
                <select 
                    value={filterOverdue} 
                    onChange={e => setFilterOverdue(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2.5"
                >
                    <option value="All">Barchasi</option>
                    <option value="Yes">Muddati o'tgan</option>
                    <option value="No">Vaqt bor</option>
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Davr</label>
                <select 
                    value={filterWeek} 
                    onChange={e => setFilterWeek(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2.5"
                >
                    <option value="All">Barcha vaqtlar</option>
                    <option value="Current">Joriy hafta</option>
                </select>
            </div>
        </div>
      </div>

      <TaskTable 
        tasks={filteredTasks}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onSort={handleSort}
        sortConfig={sortConfig}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? "Vazifani tahrirlash" : "Yangi vazifa qo'shish"}
      >
        <TaskForm 
            initialData={editingTask}
            onSubmit={handleSubmit}
            onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="Vazifani o'chirish"
        message="Rostdan ham bu vazifani o'chirmoqchimisiz? Uni keyinchalik 'Savat' bo'limidan tiklashingiz mumkin."
        confirmText="O'chirish"
      />
    </div>
  );
};