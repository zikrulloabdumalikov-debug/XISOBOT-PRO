
import { startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

export const generateTaskId = (tasks = []) => {
    const ids = tasks.map(t => parseInt(t.id) || 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return (maxId + 1).toString().padStart(6, '0');
};

export const getPresetRange = (type) => {
    const now = new Date();
    switch (type) {
        case 'bugun': return { start: startOfDay(now), end: endOfDay(now) };
        case 'hafta': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'oy': return { start: startOfMonth(now), end: endOfMonth(now) };
        default: return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31) };
    }
};
