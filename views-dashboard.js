
import React, { useState, useContext, useMemo } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { 
    parseISO, isWithinInterval, isValid, format, 
    startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
    startOfMonth as dFnsStartOfMonth, eachDayOfInterval,
    isSameDay, isAfter, isBefore, setMonth, addYears, subYears, startOfYear, endOfYear
} from 'date-fns';
import { TaskContext } from './store.js';
import { KPICard } from './ui.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const html = htm.bind(React.createElement);

const safeFormat = (date, fmt, fallback = "") => {
    if (!date || !isValid(date)) return fallback;
    try { return format(date, fmt); } catch (e) { return fallback; }
};

const MiniMonth = ({ monthDate, range, onSelect }) => {
    if (!monthDate || !isValid(monthDate)) return null;
    const monthStart = dFnsStartOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOffset = (monthStart.getDay() + 6) % 7;
    const daysOfWeek = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

    const getDayClass = (day) => {
        const start = range.start || new Date();
        const end = range.end || new Date();
        const isStart = isSameDay(day, start);
        const isEnd = isSameDay(day, end);
        let inInterval = false;
        try { inInterval = isWithinInterval(day, { start, end }); } catch (e) { inInterval = false; }
        if (isStart || isEnd) return 'bg-brand-500 text-white rounded-lg font-bold';
        if (inInterval) return 'bg-brand-50 text-brand-600';
        return 'text-slate-500 hover:bg-slate-50';
    };

    return html`
        <div class="bg-white p-3 rounded-2xl border border-slate-100 text-[9px] select-none">
            <h4 class="font-black text-slate-800 mb-2 text-center uppercase">${safeFormat(monthDate, 'MMMM')}</h4>
            <div class="grid grid-cols-7 gap-0.5 text-center text-slate-300 font-bold mb-1">
                ${daysOfWeek.map(d => html`<div key=${d}>${d}</div>`)}
            </div>
            <div class="grid grid-cols-7 gap-y-1">
                ${Array.from({ length: startDayOffset }).map((_, i) => html`<div key=${'off'+i}></div>`)}
                ${days.map(day => html`<div key=${day.toString()} onClick=${() => onSelect(day)} class="py-1.5 cursor-pointer flex items-center justify-center transition-all ${getDayClass(day)}">${format(day, 'd')}</div>`)}
            </div>
        </div>
    `;
};

const CustomCalendar = ({ isOpen, onClose, range, onRangeChange, preset }) => {
    const [viewDate, setViewDate] = useState(range.start || new Date());
    if (!isOpen) return null;

    const handleDateClick = (day) => {
        onRangeChange({ start: day, end: day });
        if (preset !== 'ixtiyoriy') onClose();
    };

    const navigate = (dir) => setViewDate(prev => dir === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));

    return html`
        <div class="absolute top-full right-0 mt-4 z-[100] animate-fade-in">
            <div class="fixed inset-0" onClick=${onClose}></div>
            <div class="relative bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 w-[320px]">
                <div class="flex items-center justify-between mb-4">
                    <button onClick=${() => navigate('prev')} class="p-2 hover:bg-slate-50 rounded-lg"><${Lucide.ChevronLeft} size="16" /></button>
                    <span class="font-black text-slate-800 uppercase text-xs">${safeFormat(viewDate, 'MMMM yyyy')}</span>
                    <button onClick=${() => navigate('next')} class="p-2 hover:bg-slate-50 rounded-lg"><${Lucide.ChevronRight} size="16" /></button>
                </div>
                <${MiniMonth} monthDate=${viewDate} range=${range} onSelect=${handleDateClick} />
                <button onClick=${onClose} class="w-full mt-4 py-2 bg-brand-900 text-white rounded-xl text-[10px] font-black uppercase">Yopish</button>
            </div>
        </div>
    `;
};

export const Dashboard = () => {
    const { tasks = [] } = useContext(TaskContext);
    const [preset, setPreset] = useState('hafta');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const [isCalOpen, setIsCalOpen] = useState(false);
    
    const range = useMemo(() => {
        const d = currentDate;
        switch (preset) {
            case 'kun': return { start: startOfDay(d), end: endOfDay(d), label: safeFormat(d, 'dd MMMM yyyy') };
            case 'hafta': return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }), label: `${safeFormat(startOfWeek(d, { weekStartsOn: 1 }), 'dd.MM')} - ${safeFormat(endOfWeek(d, { weekStartsOn: 1 }), 'dd.MM.yyyy')}` };
            case 'oy': return { start: startOfMonth(d), end: endOfMonth(d), label: safeFormat(d, 'MMMM yyyy') };
            case 'yil': return { start: startOfYear(d), end: endOfYear(d), label: safeFormat(d, 'yyyy') + "-yil" };
            case 'jami': return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31), label: "Barcha davr" };
            default: return { start: startOfDay(d), end: endOfDay(d), label: "" };
        }
    }, [preset, currentDate]);

    const handleDownload = async (type) => {
        setIsExporting(true);
        await new Promise(r => setTimeout(r, 600));
        const element = document.getElementById('dashboard-content');
        if (element) {
            const canvas = await html2canvas(element, { 
                scale: 3, 
                backgroundColor: '#f8fafc',
                onclone: (cloned) => {
                    const el = cloned.getElementById('dashboard-content');
                    el.style.padding = '40px';
                    el.querySelectorAll('*').forEach(s => { s.style.animation = 'none'; s.style.transition = 'none'; s.style.opacity = '1'; });
                }
            });
            if (type === 'png') {
                const a = document.createElement('a'); a.download = 'xisobot.png'; a.href = canvas.toDataURL(); a.click();
            } else {
                const pdf = new jsPDF('l', 'mm', 'a4');
                const img = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(img, 'JPEG', 10, 10, 277, 190);
                pdf.save('xisobot.pdf');
            }
        }
        setIsExporting(false);
    };

    const filtered = tasks.filter(t => { try { return isWithinInterval(parseISO(t.sana), range); } catch(e) { return false; } });
    const stats = { done: filtered.filter(t => t.status === 'Bajarildi').length, doing: filtered.filter(t => t.status === 'Jarayonda').length, todo: filtered.filter(t => t.status === 'Rejada').length, total: filtered.length };

    return html`
        <div id="dashboard-content" class="space-y-6 animate-fade-in p-1">
            <header class="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
                <div><h2 class="text-3xl font-black text-slate-800 tracking-tight">Monitoring</h2></div>
                <div class="flex flex-col md:flex-row gap-3 items-center">
                    ${!isExporting && html`<div class="flex gap-2"><button onClick=${() => handleDownload('png')} class="bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center"><${Lucide.Image} size="14" class="mr-2 text-blue-500"/> PNG</button><button onClick=${() => handleDownload('pdf')} class="bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center"><${Lucide.FileDown} size="14" class="mr-2 text-red-500"/> PDF</button></div>`}
                    <div class="flex bg-slate-100 p-1 rounded-2xl gap-2 relative shadow-inner">
                        <div class="flex items-center bg-white rounded-xl px-2 py-1 shadow-sm border">
                            <button onClick=${() => setCurrentDate(subDays(currentDate, 7))} class="p-1"><${Lucide.ChevronLeft} size="14"/></button>
                            <span onClick=${() => setIsCalOpen(!isCalOpen)} class="cursor-pointer px-4 text-[10px] font-black uppercase text-slate-700">${range.label}</span>
                            <button onClick=${() => setCurrentDate(addDays(currentDate, 7))} class="p-1"><${Lucide.ChevronRight} size="14"/></button>
                        </div>
                        <${CustomCalendar} isOpen=${isCalOpen} onClose=${() => setIsCalOpen(false)} range=${range} onRangeChange=${(r) => setCurrentDate(r.start)} />
                        <div class="flex bg-white rounded-xl p-1">${['kun', 'hafta', 'oy', 'jami'].map(p => html`<button onClick=${() => setPreset(p)} class="px-3 py-1.5 text-[9px] font-black uppercase rounded-lg ${preset === p ? 'bg-brand-500 text-white' : 'text-slate-400'}">${p}</button>`)}</div>
                    </div>
                </div>
            </header>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4"><${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-emerald-500" /><${KPICard} label="Jarayonda" count=${stats.doing} icon="Activity" color="text-amber-500" /><${KPICard} label="Rejada" count=${stats.todo} icon="Compass" color="text-indigo-500" /><${KPICard} label="Jami" count=${stats.total} icon="BarChart3" color="text-brand-500" /></div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`<div key=${s} class="bg-slate-100/50 p-6 rounded-[2.5rem] border min-h-[400px] flex flex-col"><div class="flex justify-between mb-6"><h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${s}</h3><span class="bg-white text-[10px] font-black px-3 py-1 rounded-xl border shadow-sm">${filtered.filter(t => t.status === s).length}</span></div><div class="space-y-4 flex-1">${filtered.filter(t => t.status === s).map(t => html`<div key=${t.id} class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all"><h4 class="font-bold text-slate-800 text-xs mb-3">${t.vazifa}</h4><div class="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase"><span class="flex items-center"><${Lucide.Calendar} size="10" class="mr-1"/> ${t.sana}</span><span class="text-brand-500">${t.progress}%</span></div></div>`)}</div></div>`)}</div>
        </div>
    `;
};
