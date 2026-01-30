import { Task } from '../types';

export const generateTaskId = (tasks: Task[]): string => {
  if (tasks.length === 0) return "000001";
  
  const maxId = tasks.reduce((max, task) => {
    const num = parseInt(task.id, 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  const nextId = maxId + 1;
  return nextId.toString().padStart(6, '0');
};
