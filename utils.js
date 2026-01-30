
import { 
    format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, startOfDay, 
    endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, 
    subYears, startOfQuarter, endOfQuarter, setMonth 
} from 'date-fns';
import { uz } from 'date-fns/locale';

export const generateTaskId = (tasks = []) => {
    if (!Array.isArray(tasks)) return "000001";
    const ids = tasks.map(t => parseInt(t.id) || 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return (maxId + 1).toString().padStart(6, '0');
};

export const getWeekRange = (date) => ({
    start: startOfWeek(date || new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(date || new Date(), { weekStartsOn: 1 })
});

export const getPresetRange = (type) => {
    const now = new Date();
    switch (type) {
        case 'bugun': return { start: startOfDay(now), end: endOfDay(now) };
        case 'kecha': return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
        case 'shuHafta': return getWeekRange(now);
        case 'otganHafta': return getWeekRange(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1));
        case 'shuOy': return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'otganOy': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
        case '1chorak': return { start: startOfQuarter(setMonth(now, 0)), end: endOfQuarter(setMonth(now, 2)) };
        case '2chorak': return { start: startOfQuarter(setMonth(now, 3)), end: endOfQuarter(setMonth(now, 5)) };
        case '3chorak': return { start: startOfQuarter(setMonth(now, 6)), end: endOfQuarter(setMonth(now, 8)) };
        case '4chorak': return { start: startOfQuarter(setMonth(now, 9)), end: endOfQuarter(setMonth(now, 11)) };
        case '1yarimYillik': return { start: startOfYear(now), end: endOfMonth(setMonth(now, 5)) };
        case '2yarimYillik': return { start: startOfMonth(setMonth(now, 6)), end: endOfYear(now) };
        case 'shuYil': return { start: startOfYear(now), end: endOfYear(now) };
        case 'otganYil': return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
        default: return getWeekRange(now);
    }
};

export const checkOverdue = (dedlayn, status) => {
    if (!dedlayn || status === 'Bajarildi') return false;
    try {
        const dDate = typeof dedlayn === 'string' ? parseISO(dedlayn) : dedlayn;
        return isBefore(dDate, startOfDay(new Date()));
    } catch (e) {
        return false;
    }
};
