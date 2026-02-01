
import React, { useState, useContext, useMemo, useEffect } from 'react';
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
import { KPICard, Modal, TaskForm } from './ui.js';
import { exportToExcel, getTaskMeta } from './utils.js';
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
    const monthName = safeFormat(monthDate, 'MMMM');

    const getDayClass = (day) => {
        const start = range.start || new Date();
        const end = range.end || new Date();
        if (!isValid(start) || !isValid(end)) return 'text-slate-400';
        const isStart = isSameDay(day, start);
        const isEnd = isSameDay(day, end);
        let inInterval = false;
        try { inInterval = isWithinInterval(day, { start, end }); } catch (e) { inInterval = false; }
        if (isStart && isEnd) return 'bg-brand-500 text-white rounded-lg font-black z-10';
        if (isStart) return 'bg-brand-500 text-white rounded-l-lg font-black z-10';
        if (isEnd) return 'bg-brand-500 text-white rounded-r-lg font-black z-10';
        if (inInterval) return 'bg-brand-50 text-brand-600 font-bold';
        return 'text-slate-500 hover:bg-slate-50 rounded-lg';
    };

    return html`
        <div class="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-default text-[9px] select-none">
            <h4 class="font-black text-slate-800 mb-2 text-center uppercase tracking-wider">${monthName}</h4>
            <div class="grid grid-cols-7 gap-0.5 text-center text-slate-300 font-bold mb-1">
                ${daysOfWeek.map(d => html`<div key=${d}>${d}</div>`)}
            </div>
            <div class="grid grid-cols-7 gap-y-1">
                ${Array.from({ length: startDayOffset }).map((_, i) => html`<div key=${'off'+i}></div>`)}
                ${days.map(day => html`
                    <div key=${day.toString()} 
                         onClick=${() => onSelect(day)}
                         class="py-1.5 cursor-pointer relative transition-all flex items-center justify-center ${getDayClass(day)}">
                        ${format(day, 'd')}
                    </div>
                `)}
            </div>
        </div>
    `;
};

const CustomCalendar = ({ isOpen, onClose, range, onRangeChange, preset }) => {
    const initialViewDate = (range.start && isValid(range.start)) ? new Date(range.start) : new Date();
    const [viewMode, setViewMode] = useState('month'); 
    const [viewDate, setViewDate] = useState(initialViewDate);
    const [selectingStart, setSelectingStart] = useState(null);
    if (!isOpen) return null;

    const handleDateClick = (day) => {
        if (!day || !isValid(day)) return;
        if (preset === 'ixtiyoriy') {
            if (!selectingStart) {
                setSelectingStart(day);
                onRangeChange({ start: day, end: day });
            } else {
                const start = isBefore(day, selectingStart) ? day : selectingStart;
                const end = isAfter(day, selectingStart) ? day : selectingStart;
                onRangeChange({ start: startOfDay(start), end: endOfDay(end) });
                setSelectingStart(null);
            }
        } else {
            onRangeChange({ start: day, end: day });
            onClose();
        }
    };

    const navigate = (type, dir) => {
        const fn = dir === 'next' ? (type === 'year' ? addYears : addMonths) : (type === 'year' ? subYears : subMonths);
        setViewDate(prev => {
            const next = fn(prev, 1);
            return isValid(next) ? next : prev;
        });
    };

    return html`
        <div class="absolute top-full right-0 mt-4 z-[100] animate-in fade-in zoom-in-95 duration-200">
            <div class="fixed inset-0" onClick=${onClose}></div>
            <div class="relative bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden w-[320px] md:w-[680px] flex flex-col max-h-[85vh]">
                <div class="p-6 bg-slate-50/50 border-b flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <button onClick=${() => navigate('year', 'prev')} class="p-2 hover:bg-white rounded-xl shadow-sm border border-slate-100 active:scale-90 transition-all">
                            <${Lucide.ChevronLeft} size="16" />
                        </button>
                        <h3 class="text-xl font-black text-slate-800 tracking-tighter">${safeFormat(viewDate, 'yyyy')}</h3>
                        <button onClick=${() => navigate('year', 'next')} class="p-2 hover:bg-white rounded-xl shadow-sm border border-slate-100 active:scale-90 transition-all">
                            <${Lucide.ChevronRight} size="16" />
                        </button>
                    </div>
                </div>
                <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    ${viewMode === 'year' ? html`<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${Array.from({ length: 12 }).map((_, i) => html`<div key=${i} class="scale-95 hover:scale-100 transition-transform"><${MiniMonth} monthDate=${setMonth(new Date(viewDate), i)} range=${range} onSelect=${handleDateClick} /></div>`)}</div>` : html`<div class="flex flex-col gap-6"><div class="flex items-center justify-between px-2"><button onClick=${() => navigate('month', 'prev')} class="p-2 text-slate-400 hover:text-brand-500"><${Lucide.ArrowLeft} size="18" /></button><span class="font-black text-slate-800 uppercase tracking-[0.2em] text-xs">${safeFormat(viewDate, 'MMMM yyyy')}</span><button onClick=${() => navigate('month', 'next')} class="p-2 text-slate-400 hover:text-brand-500"><${Lucide.ArrowRight} size="18" /></button></div><div class="scale-110 origin-top"><${MiniMonth} monthDate=${viewDate} range=${range} onSelect=${handleDateClick} /></div></div>`}
                </div>
                <div class="p-4 bg-slate-50 border-t flex justify-center gap-2"><button onClick=${() => { onRangeChange({ start: new Date(), end: new Date() }); onClose(); }} class="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-all tracking-widest">Bugun</button><button onClick=${onClose} class="px-10 py-2 bg-brand-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all tracking-widest shadow-lg">Tayyor</button></div>
            </div>
        </div>
    `;
};

export const Dashboard = () => {
    const { tasks = [] } = useContext(TaskContext);
    const [preset, setPreset] = useState('hafta');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [customRange, setCustomRange] = useState({ start: new Date(), end: new Date() });
    const [isExporting, setIsExporting] = useState(false);
    const [isCalOpen, setIsCalOpen] = useState(false);
    
    const range = useMemo(() => {
        const d = (currentDate && isValid(currentDate)) ? currentDate : new Date();
        if (preset === 'ixtiyoriy') {
            const s = (customRange.start && isValid(customRange.start)) ? customRange.start : new Date();
            const e = (customRange.end && isValid(customRange.end)) ? customRange.end : new Date();
            return { start: startOfDay(s), end: endOfDay(e), label: `${safeFormat(s, 'dd.MM')} - ${safeFormat(e, 'dd.MM.yy')}` };
        }
        switch (preset) {
            case 'kun': return { start: startOfDay(d), end: endOfDay(d), label: safeFormat(d, 'dd MMMM yyyy') };
            case 'hafta': return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }), label: `${safeFormat(startOfWeek(d, { weekStartsOn: 1 }), 'dd.MM')} - ${safeFormat(endOfWeek(d, { weekStartsOn: 1 }), 'dd.MM.yyyy')}` };
            case 'oy': return { start: startOfMonth(d), end: endOfMonth(d), label: safeFormat(d, 'MMMM yyyy') };
            case 'yil': return { start: startOfYear(d), end: endOfYear(d), label: safeFormat(d, 'yyyy') + "-yil" };
            case 'jami': return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31), label: "Barcha davr" };
            default: return { start: startOfDay(d), end: endOfDay(d), label: "" };
        }
    }, [preset, currentDate, customRange]);

    const handleDateFromCalendar = (newRange) => {
        if (preset === 'ixtiyoriy') setCustomRange(newRange);
        else setCurrentDate(newRange.start);
    };

    const handleNavigate = (direction) => {
        if (preset === 'jami' || preset === 'ixtiyoriy') return;
        const fnMap = direction === 'next' ? { kun: addDays, hafta: addWeeks, oy: addMonths, yil: addYears } : { kun: subDays, hafta: subWeeks, oy: subMonths, yil: subYears };
        const currentFn = fnMap[preset];
        if (currentFn) setCurrentDate(prev => { const next = currentFn(prev, 1); return isValid(next) ? next : prev; });
    };

    const handleDownload = async (type) => {
        setIsExporting(true);
        await new Promise(r => setTimeout(r, 600));
        
        const element = document.getElementById('dashboard-content');
        if (element) {
            try {
                const canvas = await html2canvas(element, { 
                    scale: 3, 
                    backgroundColor: '#f8fafc',
                    useCORS: true,
                    logging: false,
                    onclone: (clonedDoc) => { 
                        const el = clonedDoc.getElementById('dashboard-content'); 
                        if (el) { 
                            el.style.padding = '40px'; 
                            el.querySelectorAll('*').forEach(s => { 
                                s.style.animation = 'none !important'; 
                                s.style.transition = 'none !important';
                                s.style.opacity = '1 !important';
                                s.style.visibility = 'visible !important';
                                s.style.transform = 'none !important';
                            });
                        } 
                    }
                });

                const dateStr = format(new Date(), 'dd-MM-yyyy');
                if (type === 'png') { 
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    const a = document.createElement('a'); 
                    a.download = `xisobot_${preset}_${dateStr}.png`; a.href = imgData; a.click(); 
                } else { 
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' }); 
                    const pw = pdf.internal.pageSize.getWidth(); 
                    const ph = pdf.internal.pageSize.getHeight();
                    const props = pdf.getImageProperties(imgData); 
                    const ratio = props.width / props.height; 
                    let iw = pw - 20; let ih = iw / ratio; 
                    if (ih > ph - 20) { ih = ph - 20; iw = ih * ratio; }
                    pdf.addImage(imgData, 'JPEG', (pw-iw)/2, (ph-ih)/2, iw, ih); 
                    pdf.save(`xisobot_${preset}_${dateStr}.pdf`); 
                }
            } catch(e) { console.error(e); }
        }
        setIsExporting(false);
    };

    const filtered = (tasks || []).filter(t => { if (!t?.sana) return false; try { const d = parseISO(t.sana); return isValid(d) && isWithinInterval(d, { start: range.start, end: range.end }); } catch(e) { return false; } });
    const stats = { done: filtered.filter(t => t.status === 'Bajarildi').length, doing: filtered.filter(t => t.status === 'Jarayonda').length, todo: filtered.filter(t => t.status === 'Rejada').length, total: filtered.length };

    return html`
        <div id="dashboard-content" class="space-y-6 md:space-y-10 animate-fade-in p-1">
            <header class="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
                <div><div class="flex items-center gap-2 mb-1"><span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span><p class="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Tizim Faol</p></div><h2 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Monitoring</h2></div>
                <div class="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
                    ${!isExporting && html`<div class="flex gap-2 w-full md:w-auto mr-2"><button onClick=${() => handleDownload('png')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider"><${Lucide.Image} size="16" class="mr-2 text-blue-500" /> PNG</button><button onClick=${() => handleDownload('pdf')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider"><${Lucide.FileDown} size="16" class="mr-2 text-red-500" /> PDF</button></div>`}
                    <div class="flex flex-col md:flex-row bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto shadow-inner relative">
                        <div class="flex items-center justify-between bg-white rounded-xl px-2 py-1 shadow-sm border border-slate-200/50 min-w-[150px]"><button onClick=${() => handleNavigate('prev')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><${Lucide.ChevronLeft} size="16" strokeWidth="3" /></button><div onClick=${() => setIsCalOpen(!isCalOpen)} class="cursor-pointer px-4 text-center"><span class="text-xs font-black text-slate-700 uppercase tracking-wider">${range.label}</span></div><button onClick=${() => handleNavigate('next')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><${Lucide.ChevronRight} size="16" strokeWidth="3" /></button></div>
                        <${CustomCalendar} isOpen=${isCalOpen} onClose=${() => setIsCalOpen(false)} range=${range} onRangeChange=${handleDateFromCalendar} preset=${preset} />
                        <div class="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200/50">${['kun', 'hafta', 'oy', 'yil', 'jami'].map(p => html`<button key=${p} onClick=${() => setPreset(p)} class="px-3 md:px-4 py-2 text-[10px] font-extrabold uppercase rounded-lg ${preset === p ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}">${p}</button>`)}</div>
                    </div>
                </div>
            </header>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"><${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-emerald-500" /><${KPICard} label="Jarayonda" count=${stats.doing} icon="Activity" color="text-amber-500" /><${KPICard} label="Rejada" count=${stats.todo} icon="Compass" color="text-indigo-500" /><${KPICard} label="Jami" count=${stats.total} icon="BarChart3" color="text-brand-500" /></div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-10">${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`<div key=${s} class="bg-slate-100/50 p-4 md:p-6 rounded-[2.5rem] border border-slate-200/50 min-h-[500px] flex flex-col"><div class="flex items-center justify-between mb-8 px-2"><h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">${s}</h3><span class="bg-white text-[11px] font-black px-3 py-1 rounded-xl border border-slate-200 shadow-sm">${filtered.filter(t => t.status === s).length}</span></div><div class="space-y-4 flex-1 pr-2">${filtered.filter(t => t.status === s).map(t => html`<div key=${t.id} class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group cursor-pointer mb-4"><h4 class="font-bold text-slate-800 text-sm mb-4 break-words">${t.vazifa}</h4><div class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider"><span class="flex items-center"><${Lucide.Calendar} size="12" class="mr-2 opacity-50" /> ${t.sana}</span><span class="text-brand-500 font-black">${t.progress}%</span></div></div>`)}</div></div>`)}</div>
        </div>
    `;
};

export const TasksPage = () => {
    const { tasks = [], addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [modalTask, setModalTask] = useState(null);
    const [sort, setSort] = useState({ key: 'id', dir: 'desc' });

    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            let valA = a[sort.key], valB = b[sort.key];
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tasks, sort]);

    return html`
        <div class="space-y-8 animate-fade-in pb-20">
            <header class="flex justify-between items-center"><div><h2 class="text-3xl font-black text-slate-800 tracking-tight">Vazifalar</h2><p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Jami ${tasks.length} ta yozuv</p></div><button onClick=${() => { setModalTask(null); setIsForm(true); }} class="bg-brand-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs flex items-center shadow-xl active:scale-95 transition-all"><${Lucide.Plus} size="20" class="mr-2" /> Yangi</button></header>
            <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden overflow-x-auto"><table class="w-full text-left text-[11px] border-separate border-spacing-0"><thead class="sticky top-0 bg-slate-100 shadow-sm z-20"><tr>${['ID', 'Sana', 'Vazifa', 'Status', 'Prioritet'].map(label => html`<th class="px-6 py-4 border-b border-slate-200 font-extrabold uppercase tracking-widest text-slate-400 text-[10px]">${label}</th>`)}<th class="px-6 py-4 border-b border-slate-200 text-right">Amallar</th></tr></thead><tbody class="divide-y divide-slate-100">${sortedTasks.map(t => html`<tr key=${t.id} class="hover:bg-slate-50 transition-colors"><td class="px-6 py-4 font-mono text-slate-300 text-[10px]">${t.id}</td><td class="px-6 py-4 font-bold text-slate-600">${t.sana}</td><td class="px-6 py-4 font-extrabold text-slate-800 text-[12px] min-w-[200px]">${t.vazifa}</td><td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg font-black uppercase text-[9px] ${t.status === 'Bajarildi' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${t.status}</span></td><td class="px-6 py-4 font-bold ${t.prioritet === 'Juda muhum' ? 'text-red-500' : 'text-slate-500'}">${t.prioritet}</td><td class="px-6 py-4 text-right"><div class="flex justify-end gap-1"><button onClick=${() => { setModalTask(t); setIsForm(true); }} class="p-2 text-brand-400 hover:text-brand-600 transition-colors"><${Lucide.Pencil} size="14" /></button><button onClick=${() => deleteTask(t.id)} class="p-2 text-slate-300 hover:text-red-500 transition-colors"><${Lucide.Trash2} size="14" /></button></div></td></tr>`)}</tbody></table></div>
            <${Modal} isOpen=${isForm} onClose=${() => setIsForm(false)} title=${modalTask ? "Vazifani tahrirlash" : "Yangi vazifa"}><${TaskForm} task=${modalTask} onSubmit=${(d) => { if(modalTask) updateTask(d); else addTask(d); setIsForm(false); }} onCancel=${() => setIsForm(false)} /><//>
        </div>
    `;
};

export const TrashPage = () => {
    const { deletedTasks = [], restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-8 animate-fade-in">
            <header class="flex justify-between items-center"><h2 class="text-3xl font-black text-slate-800 tracking-tight">Savat</h2><button onClick=${clearTrash} class="text-red-500 font-black text-[11px] uppercase tracking-[0.2em] px-6 py-3 rounded-2xl hover:bg-red-50 transition-all">Tozalash</button></header>
            <div class="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">${deletedTasks.length === 0 ? html`<div class="py-20 flex flex-col items-center opacity-20 grayscale"><${Lucide.Recycle} size="60" /><p class="font-bold uppercase tracking-widest text-xs mt-4">Savat bo'sh</p></div>` : html`<div class="divide-y divide-slate-50">${deletedTasks.map(t => html`<div key=${t.id} class="p-8 flex justify-between items-center gap-4 hover:bg-slate-50 transition-all"><div><p class="font-bold text-slate-800 text-lg">${t.vazifa}</p><p class="text-[10px] text-slate-400 font-black uppercase mt-1">ID: ${t.id}</p></div><button onClick=${() => restoreTask(t.id)} class="bg-brand-50 text-brand-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-brand-900 hover:text-white transition-all">Tiklash</button></div>`)}</div>`}</div>
        </div>
    `;
};

export const HelpPage = () => {
    return html`
        <div class="space-y-12 animate-fade-in pb-20">
            <header><h2 class="text-3xl font-black text-slate-800 tracking-tight">Yordam</h2><p class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Professional yo'riqnomalar</p></header>
            <div class="bg-brand-900 p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div class="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500"><${Lucide.Headset} size="200" /></div>
                <div class="relative z-10">
                    <h3 class="text-3xl font-black mb-4 tracking-tight">Texnik yordam</h3>
                    <p class="text-teal-100/60 font-medium mb-8 max-w-md italic">Tizim bo'yicha har qanday savollaringiz bo'lsa, bizga murojaat qiling.</p>
                    <div class="flex gap-4"><a href="tel:+998999004430" class="bg-white text-brand-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all">+998 99 900 44 30</a><a href="https://t.me/xisobotpro_admin" target="_blank" class="bg-teal-500/20 border border-teal-500/30 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-500/40 transition-all">Telegram</a></div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="bg-white p-8 rounded-[2rem] border border-slate-200"><h4 class="text-lg font-black text-slate-800 mb-4 tracking-tight">Qo'llanma</h4><ul class="space-y-4 text-slate-500 text-sm font-medium"><li class="flex gap-3"><span class="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black">1</span> Dashboard orqali haftalik hisobotlarni PNG/PDF qilib yuklab oling.</li><li class="flex gap-3"><span class="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black">2</span> Vazifalar jadvalida katakchalarni bosib joyida tahrirlang.</li><li class="flex gap-3"><span class="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black">3</span> O'chirilgan vazifalar Savatdan qayta tiklanishi mumkin.</li></ul></div></div>
        </div>
    `;
};
