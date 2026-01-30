
import { 
    format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, startOfDay, 
    endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, 
    subYears, startOfQuarter, endOfQuarter, setMonth 
} from 'date-fns';
import { uz } from 'date-fns/locale';

export const generateTaskId = (tasks) => {
    const maxId = tasks.reduce((max, t) => Math.max(max, parseInt(t.id) || 0), 0);
    return (maxId + 1).toString().padStart(6, '0');
};

export const getWeekRange = (date) => ({
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 })
});

export const getPresetRange = (type) => {
    const now = new Date();
    switch (type) {
        case 'today': return { start: startOfDay(now), end: endOfDay(now) };
        case 'yesterday': return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
        case 'thisWeek': return getWeekRange(now);
        case 'prevWeek': return getWeekRange(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1));
        case 'thisMonth': return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'prevMonth': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
        case 'q1': return { start: startOfQuarter(setMonth(now, 0)), end: endOfQuarter(setMonth(now, 2)) };
        case 'q2': return { start: startOfQuarter(setMonth(now, 3)), end: endOfQuarter(setMonth(now, 5)) };
        case 'q3': return { start: startOfQuarter(setMonth(now, 6)), end: endOfQuarter(setMonth(now, 8)) };
        case 'q4': return { start: startOfQuarter(setMonth(now, 9)), end: endOfQuarter(setMonth(now, 11)) };
        case 'half1': return { start: startOfYear(now), end: endOfMonth(setMonth(now, 5)) };
        case 'half2': return { start: startOfMonth(setMonth(now, 6)), end: endOfYear(now) };
        case 'thisYear': return { start: startOfYear(now), end: endOfYear(now) };
        case 'prevYear': return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
        default: return getWeekRange(now);
    }
};

export const checkOverdue = (dedlayn, status) => {
    if (!dedlayn || status === 'Bajarildi') return false;
    return isBefore(parseISO(dedlayn), startOfDay(new Date()));
};
