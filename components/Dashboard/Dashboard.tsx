import React, { useState, useRef } from 'react';
import { useTasks } from '../../context/TaskContext';
import { getWeekRange, isDateInWeek, PresetType } from '../../utils/dateUtils';
import { WeekPicker } from './WeekPicker'; 
import { KPICards } from './KPICards';
import { TaskColumns } from './TaskColumns';
import { Modal } from '../Shared/Modal';
import { ConfirmModal } from '../Shared/ConfirmModal';
import { TaskForm } from '../Tasks/TaskForm';
import { Task } from '../../types';
import { Button } from '../Shared/Button';
import { Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { tasks, updateTask, deleteTask } = useTasks();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date; preset: PresetType }>(() => {
    const { start, end } = getWeekRange(new Date());
    return { start, end, preset: 'thisWeek' };
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Confirm Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredTasks = tasks.filter(t => isDateInWeek(t.sana, dateRange.start, dateRange.end));

  const stats = {
    completed: filteredTasks.filter(t => t.status === "Bajarildi").length,
    inProgress: filteredTasks.filter(t => t.status === "Jarayonda").length,
    planned: filteredTasks.filter(t => t.status === "Rejada").length,
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleSaveTask = (data: Omit<Task, 'id'>) => {
    if (selectedTask) {
      updateTask({ ...data, id: selectedTask.id });
      setIsEditModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (selectedTask) {
      deleteTask(selectedTask.id);
      setIsEditModalOpen(false);
      setSelectedTask(null);
      setShowDeleteConfirm(false);
    }
  };

  const generateCanvas = async (element: HTMLElement) => {
    const originalScrollPos = window.scrollY;
    const exportWidth = 1440; 
    
    const canvas = await html2canvas(element, {
      scale: 2, 
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f9fafb',
      logging: false,
      width: exportWidth,
      windowWidth: exportWidth,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.querySelector('[data-capture="dashboard"]') as HTMLElement;
        if (clonedEl) {
          clonedEl.style.width = `${exportWidth}px`;
          clonedEl.style.height = 'auto';
          clonedEl.style.padding = '40px';
          clonedEl.style.overflow = 'visible';

          const texts = clonedEl.querySelectorAll('.line-clamp-2, .line-clamp-1');
          texts.forEach(t => {
            const style = (t as HTMLElement).style;
            style.display = 'block';
            style.setProperty('-webkit-line-clamp', 'unset');
            style.setProperty('line-clamp', 'unset');
            style.overflow = 'visible';
          });

          const columns = clonedEl.querySelectorAll('.min-h-\\[400px\\]');
          columns.forEach(col => {
            (col as HTMLElement).style.height = 'auto';
            (col as HTMLElement).style.minHeight = 'fit-content';
          });

          const grid = clonedEl.querySelector('.grid-cols-1');
          if (grid) {
            grid.classList.remove('grid-cols-1');
            grid.classList.add('grid-cols-3');
          }
        }
      }
    });

    window.scrollTo(0, originalScrollPos);
    return canvas;
  };

  const handleDownloadPNG = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const canvas = await generateCanvas(dashboardRef.current);
      const link = document.createElement('a');
      link.download = `Haftalik_Hisobot_${format(dateRange.start, 'dd-MM-yyyy')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('PNG export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const canvas = await generateCanvas(dashboardRef.current);
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Haftalik_Hisobot_${format(dateRange.start, 'dd-MM-yyyy')}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Haftalik Hisobot</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleDownloadPNG} 
            variant="secondary" 
            size="sm" 
            disabled={isExporting}
            className="shadow-sm border-gray-300 bg-white"
          >
            {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ImageIcon size={16} className="mr-2 text-teal-700" />}
            PNG
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            variant="secondary" 
            size="sm"
            disabled={isExporting}
            className="shadow-sm border-gray-300 bg-white"
          >
            {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileText size={16} className="mr-2 text-red-600" />}
            PDF
          </Button>
        </div>
      </div>
      
      <div ref={dashboardRef} className="p-1" data-capture="dashboard">
        <WeekPicker 
          startDate={dateRange.start} 
          endDate={dateRange.end}
          selectedPreset={dateRange.preset}
          onChange={setDateRange}
        />

        <KPICards {...stats} />

        <TaskColumns tasks={filteredTasks} onTaskClick={handleTaskClick} />
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Vazifani tahrirlash"
      >
         {selectedTask && (
             <>
                <TaskForm 
                    initialData={selectedTask}
                    onSubmit={handleSaveTask}
                    onCancel={() => setIsEditModalOpen(false)}
                />
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-mono">ID: {selectedTask.id}</span>
                    <Button variant="danger" size="sm" onClick={handleDeleteClick}>Vazifani o'chirish</Button>
                </div>
             </>
         )}
      </Modal>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Vazifani o'chirish"
        message="Rostdan ham bu vazifani o'chirmoqchimisiz? Uni 'Savat' bo'limidan tiklashingiz mumkin."
      />
    </div>
  );
};