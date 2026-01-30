import * as XLSX from 'xlsx';
import { Task } from '../types';

export const exportToExcel = (tasks: Task[], fileName: string = 'Vazifalar_Hisoboti.xlsx') => {
  const data = tasks.map(t => ({
    'ID': t.id,
    'Sana': t.sana,
    'Vazifa': t.vazifa,
    'Status': t.status,
    'Prioritet': t.prioritet,
    'Dedlayn': t.dedlayn || '-',
    'Progress (%)': Math.round(t.progress * 100),
    'Tavsif': t.tavsif,
    'Izoh': t.izoh
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vazifalar");
  
  // Download the file
  XLSX.writeFile(workbook, fileName);
};