
import { startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth, format, getWeek, getYear, parseISO, isBefore, isWithinInterval, isValid } from 'date-fns';

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

export const exportToExcel = async (tasks = []) => {
    if (tasks.length === 0) return alert("Eksport qilish uchun ma'lumot yo'q!");
    
    // Dynamic import for Performance
    const XLSX = await import('xlsx');

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

// --- TOAST SYSTEM (Vanilla JS) ---
export const showToast = (message, type = 'info') => {
    // 1. Container mavjudligini tekshirish yoki yaratish
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    // 2. Ranglarni aniqlash
    const styles = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    const styleClass = styles[type] || styles.info;
    const iconSvg = icons[type] || icons.info;

    // 3. Toast elementini yaratish
    const toast = document.createElement('div');
    toast.className = `min-w-[300px] max-w-sm p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all duration-500 transform translate-y-10 opacity-0 pointer-events-auto ${styleClass}`;
    toast.innerHTML = `
        <div class="shrink-0">${iconSvg}</div>
        <p class="text-xs font-bold">${message}</p>
    `;

    // 4. DOM ga qo'shish
    container.appendChild(toast);

    // 5. Animatsiya (Slide Up)
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // 6. O'chirish logikasi
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 500); // Transition vaqti bilan bir xil
    }, 3500);
};
