
import { startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth, format, getWeek, getYear, parseISO, isBefore, isWithinInterval, isValid } from 'date-fns';
import * as XLSX from 'xlsx';

export const generateTaskId = (tasks = []) => {
    const ids = tasks.map(t => parseInt(t.id) || 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return (maxId + 1).toString().padStart(6, '0');
};

export const getTaskMeta = (sana, dedlayn, status) => {
    try {
        const date = sana ? parseISO(sana) : new Date();
        const now = new Date();
        
        if (!isValid(date)) throw new Error("Invalid date");

        const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
        
        const weekNum = getWeek(date, { weekStartsOn: 1 });
        const year = getYear(date);
        const isCurrentWeek = isWithinInterval(date, { start: startOfCurrentWeek, end: endOfCurrentWeek });
        const isOldWeek = isBefore(date, startOfCurrentWeek);
        
        let isOverdue = "Yo'q";
        if (status !== 'Bajarildi' && dedlayn) {
            const dDate = parseISO(dedlayn);
            if (isValid(dDate) && isBefore(dDate, startOfDay(now))) {
                isOverdue = "Ha";
            }
        }

        return {
            weekNum,
            year,
            isCurrentWeek: isCurrentWeek ? "Ha" : "Yo'q",
            isOldWeek: isOldWeek ? "Ha" : "Yo'q",
            isOverdue
        };
    } catch (e) {
        return { weekNum: 0, year: 2024, isCurrentWeek: "Yo'q", isOldWeek: "Yo'q", isOverdue: "Yo'q" };
    }
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

export const exportToExcel = (tasks = []) => {
    if (tasks.length === 0) return alert("Eksport qilish uchun ma'lumot yo'q!");
    
    const data = tasks.map(t => {
        const meta = getTaskMeta(t.sana, t.dedlayn, t.status);
        return {
            'ID': t.id,
            'Sana': t.sana,
            'Vazifa': t.vazifa,
            'Tavsif': t.tavsif || '',
            'Status': t.status,
            'Izoh': t.izoh || '',
            'Bu hafta': meta.isCurrentWeek,
            'Hafta №': meta.weekNum,
            'Yil': meta.year,
            'Prioritet': t.prioritet || 'Muhum emas',
            'Dedlayn': t.dedlayn || '',
            'Progress': t.progress + '%',
            'Proshrocheno?': meta.isOverdue,
            'Eski hafta': meta.isOldWeek
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vazifalar");
    
    const fileName = `xisobot_PRO_full_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
