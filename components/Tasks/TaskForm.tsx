import React, { useState, useEffect } from 'react';
import { Task, Status, Priority, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../types';
import { Button } from '../Shared/Button';
import { formatDateISO } from '../../utils/dateUtils';

interface TaskFormProps {
  initialData?: Task;
  onSubmit: (data: Omit<Task, 'id'>) => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    sana: formatDateISO(new Date()),
    vazifa: '',
    tavsif: '',
    status: 'Rejada',
    izoh: '',
    prioritet: 'Muhum',
    dedlayn: null,
    progress: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        sana: initialData.sana,
        vazifa: initialData.vazifa,
        tavsif: initialData.tavsif,
        status: initialData.status,
        izoh: initialData.izoh,
        prioritet: initialData.prioritet,
        dedlayn: initialData.dedlayn,
        progress: initialData.progress,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updates = { ...prev, [name]: value };
      
      // Auto-update progress if status is Bajarildi
      if (name === 'status' && value === 'Bajarildi') {
        updates.progress = 1;
      }
      
      return updates;
    });
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, progress: parseFloat(e.target.value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inputClasses = "mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-teal-500 focus:ring-teal-500 border p-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Sana</label>
          <input
            type="date"
            name="sana"
            required
            value={formData.sana}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Dedlayn</label>
          <input
            type="date"
            name="dedlayn"
            value={formData.dedlayn || ''}
            onChange={(e) => setFormData(prev => ({...prev, dedlayn: e.target.value || null}))}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Vazifa</label>
        <input
          type="text"
          name="vazifa"
          required
          value={formData.vazifa}
          onChange={handleChange}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Tavsif</label>
        <textarea
          name="tavsif"
          rows={3}
          value={formData.tavsif}
          onChange={handleChange}
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={inputClasses}
          >
            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Prioritet</label>
          <select
            name="prioritet"
            value={formData.prioritet}
            onChange={handleChange}
            className={inputClasses}
          >
            {PRIORITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Progress</label>
        <select
            name="progress"
            value={formData.progress}
            onChange={handleProgressChange}
            className={inputClasses}
          >
            {Array.from({ length: 11 }).map((_, i) => {
              const val = Math.round((i * 0.1) * 10) / 10;
              return <option key={val} value={val}>{Math.round(val * 100)}%</option>
            })}
          </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Izoh</label>
        <textarea
          name="izoh"
          rows={2}
          value={formData.izoh}
          onChange={handleChange}
          className={inputClasses}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>Bekor qilish</Button>
        <Button type="submit" variant="primary">Saqlash</Button>
      </div>
    </form>
  );
};