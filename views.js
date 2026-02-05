
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
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

// --- Session & Local Storage Hooks ---
function useSessionState(key, defaultValue) {
    const [state, setState] = useState(() => {
        try {
            const stored = sessionStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) { return defaultValue; }
    });
    useEffect(() => { sessionStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
    return [state, setState];
}

function useLocalState(key, defaultValue) {
    const [state, setState] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) { return defaultValue; }
    });
    useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
    return [state, setState];
}

// --- Helper Components ---
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
                    <div class="flex bg-white p-1 rounded-xl border border-slate-200 shadow-inner">
                        <button onClick=${() => setViewMode('month')} class="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${viewMode === 'month' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400'}">Oy</button>
                        <button onClick=${() => setViewMode('year')} class="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${viewMode === 'year' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400'}">Yil</button>
                    </div>
                </div>
                <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    ${preset === 'ixtiyoriy' && html`<div class="mb-4 bg-brand-50 p-3 rounded-2xl flex items-center justify-between border border-brand-100 animate-pulse"><span class="text-[10px] font-black text-brand-700 uppercase tracking-widest">${selectingStart ? "Yakuniy sanani tanlang..." : "Boshlanish sanasini tanlang..."}</span><${Lucide.Edit3} size="14" class="text-brand-500" /></div>`}
                    ${viewMode === 'year' ? html`<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${Array.from({ length: 12 }).map((_, i) => html`<div key=${i} class="scale-95 hover:scale-100 transition-transform"><${MiniMonth} monthDate=${setMonth(new Date(viewDate), i)} range=${range} onSelect=${handleDateClick} /></div>`)}</div>` : html`<div class="flex flex-col gap-6"><div class="flex items-center justify-between px-2"><button onClick=${() => navigate('month', 'prev')} class="p-2 text-slate-400 hover:text-brand-500"><${Lucide.ArrowLeft} size="18" /></button><span class="font-black text-slate-800 uppercase tracking-[0.2em] text-xs">${safeFormat(viewDate, 'MMMM yyyy')}</span><button onClick=${() => navigate('month', 'next')} class="p-2 text-slate-400 hover:text-brand-500"><${Lucide.ArrowRight} size="18" /></button></div><div class="scale-110 origin-top"><${MiniMonth} monthDate=${viewDate} range=${range} onSelect=${handleDateClick} /></div></div>`}
                </div>
                <div class="p-4 bg-slate-50 border-t flex justify-center gap-2"><button onClick=${() => { onRangeChange({ start: new Date(), end: new Date() }); onClose(); }} class="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-all tracking-widest">Bugun</button><button onClick=${onClose} class="px-10 py-2 bg-brand-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all tracking-widest shadow-lg">Tayyor</button></div>
            </div>
        </div>
    `;
};

// --- Column Settings Component ---
const ColumnSettings = ({ allColumns, hiddenColumns, setHiddenColumns, onClose }) => {
    const toggleCol = (key) => {
        if (hiddenColumns.includes(key)) {
            setHiddenColumns(hiddenColumns.filter(k => k !== key));
        } else {
            setHiddenColumns([...hiddenColumns, key]);
        }
    };
    return html`
        <div class="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-[70] p-3 animate-in fade-in zoom-in-95" onClick=${e => e.stopPropagation()}>
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 px-1">Ustunlarni boshqarish</h4>
            <div class="space-y-1">
                ${allColumns.map(col => html`
                    <div key=${col.key} class="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer" onClick=${() => toggleCol(col.key)}>
                        <span class="text-xs font-medium text-slate-600">${col.label}</span>
                        <div class="w-8 h-4 bg-slate-200 rounded-full relative transition-colors ${!hiddenColumns.includes(col.key) ? 'bg-brand-500' : ''}">
                            <div class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${!hiddenColumns.includes(col.key) ? 'translate-x-4' : ''}"></div>
                        </div>
                    </div>
                `)}
            </div>
            <button onClick=${onClose} class="w-full mt-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg hover:bg-slate-200 transition-colors">Yopish</button>
        </div>
    `;
};

// --- MAIN DASHBOARD COMPONENT ---
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
        if (preset === 'ixtiyoriy') {
            setCustomRange(newRange);
        } else {
            setCurrentDate(newRange.start);
        }
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
                            el.style.width = '1400px'; 
                            el.style.height = 'auto'; 
                            el.style.overflow = 'visible';
                            
                            const allElements = el.querySelectorAll('*');
                            allElements.forEach(node => {
                                node.style.boxShadow = 'none';
                                node.style.textShadow = 'none';
                                node.style.filter = 'none';
                                node.style.backdropFilter = 'none';
                                node.style.animation = 'none';
                                node.style.transition = 'none';
                                node.style.opacity = '1';
                                node.style.transform = 'none';
                            });

                            el.querySelectorAll('.bg-white').forEach(card => {
                                card.style.boxShadow = 'none';
                                card.style.border = '1px solid #cbd5e1'; 
                                card.style.borderRadius = '24px';
                            });

                            el.querySelectorAll('.rounded-3xl').forEach(card => {
                                card.style.border = '1px solid #cbd5e1';
                            });
                        } 
                    }
                });

                const dateStr = format(new Date(), 'dd-MM-yyyy');

                if (type === 'png') { 
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    const a = document.createElement('a'); 
                    a.download = `xisobot_${preset}_${dateStr}.png`; 
                    a.href = imgData; 
                    a.click(); 
                } else { 
                    const imgData = canvas.toDataURL('image/jpeg', 0.98);
                    const pdf = new jsPDF({ 
                        orientation: 'l', 
                        unit: 'mm', 
                        format: 'a4',
                        hotfixes: ["px_scaling"]
                    }); 
                    
                    const pw = pdf.internal.pageSize.getWidth(); 
                    const ph = pdf.internal.pageSize.getHeight();
                    const props = pdf.getImageProperties(imgData); 
                    const ratio = props.width / props.height; 
                    
                    let iw = pw - 20; 
                    let ih = iw / ratio; 
                    
                    if (ih > ph - 20) {
                        ih = ph - 20;
                        iw = ih * ratio;
                    }

                    const x = (pw - iw) / 2;
                    const y = (ph - ih) / 2;

                    pdf.addImage(imgData, 'JPEG', x, y, iw, ih, undefined, 'FAST'); 
                    pdf.save(`xisobot_${preset}_${dateStr}.pdf`); 
                }
            } catch(e) { 
                console.error("Eksportda xatolik:", e); 
            }
        }
        setIsExporting(false);
    };

    const filtered = (tasks || []).filter(t => { if (!t?.sana) return false; try { const d = parseISO(t.sana); return isValid(d) && isWithinInterval(d, { start: range.start, end: range.end }); } catch(e) { return false; } });
    const stats = { done: filtered.filter(t => t.status === 'Bajarildi').length, doing: filtered.filter(t => t.status === 'Jarayonda').length, todo: filtered.filter(t => t.status === 'Rejada').length, total: filtered.length };

    return html`
        <div id="dashboard-content" class="space-y-6 md:space-y-10 animate-fade-in p-1 bg-[#f8fafc]">
            <header class="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 relative">
                <div><div class="flex items-center gap-2 mb-1"><span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span><p class="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Tizim Faol</p></div><h2 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Monitoring</h2></div>
                <div class="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center" data-html2canvas-ignore="true">
                    ${!isExporting && html`<div class="flex gap-2 w-full md:w-auto mr-2"><button onClick=${() => handleDownload('png')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-wider"><${Lucide.Image} size="16" class="mr-2 text-blue-500" /> PNG</button><button onClick=${() => handleDownload('pdf')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-wider"><${Lucide.FileDown} size="16" class="mr-2 text-red-500" /> PDF</button></div>`}
                    <div class="flex flex-col md:flex-row bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto shadow-inner relative">
                        ${preset !== 'jami' && html`<div class="flex items-center justify-between bg-white rounded-xl px-2 py-1 shadow-sm border border-slate-200/50 w-full md:w-auto"><button onClick=${() => handleNavigate('prev')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors active:scale-90 ${preset === 'ixtiyoriy' ? 'opacity-20 cursor-not-allowed' : ''}"><${Lucide.ChevronLeft} size="16" strokeWidth="3" /></button><div onClick=${() => setIsCalOpen(!isCalOpen)} class="group flex items-center justify-center cursor-pointer px-4 h-full min-w-[150px] select-none"><span class="text-xs font-black text-slate-700 uppercase tracking-wider whitespace-nowrap text-center group-hover:text-brand-500 transition-colors">${range.label}</span><${Lucide.Edit3} size="14" class="ml-2 text-slate-300 group-hover:text-brand-500 transition-all ${preset === 'ixtiyoriy' ? 'text-brand-500' : ''}" /></div><button onClick=${() => handleNavigate('next')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors active:scale-90 ${preset === 'ixtiyoriy' ? 'opacity-20 cursor-not-allowed' : ''}"><${Lucide.ChevronRight} size="16" strokeWidth="3" /></button></div>`}
                        <${CustomCalendar} isOpen=${isCalOpen} onClose=${() => setIsCalOpen(false)} range=${range} onRangeChange=${handleDateFromCalendar} preset=${preset} />
                        <div class="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200/50 w-full md:w-auto overflow-x-auto gap-0.5">${['kun', 'hafta', 'oy', 'yil', 'ixtiyoriy', 'jami'].map(p => html`<button key=${p} onClick=${() => { setPreset(p); if(p!=='ixtiyoriy') setIsCalOpen(false); }} class="px-3 md:px-4 py-2 text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 ${preset === p ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}">${p}</button>`)}</div>
                    </div>
                </div>
            </header>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"><${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-emerald-500" /><${KPICard} label="Jarayonda" count=${stats.doing} icon="Activity" color="text-amber-500" /><${KPICard} label="Rejada" count=${stats.todo} icon="Compass" color="text-indigo-500" /><${KPICard} label="Jami" count=${stats.total} icon="BarChart3" color="text-brand-500" /></div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-10">${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`<div key=${s} class="bg-slate-100/50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200/50 min-h-[300px] md:min-h-[500px] flex flex-col"><div class="flex items-center justify-between mb-6 md:mb-8 px-2"><h3 class="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">${s}</h3><span class="bg-white text-[10px] md:text-[11px] font-black px-3 py-1 rounded-xl border border-slate-200 shadow-sm">${filtered.filter(t => t.status === s).length}</span></div><div class="space-y-4 md:y-5 flex-1 ${!isExporting ? 'overflow-y-auto custom-scrollbar max-h-[400px] md:max-h-none' : ''} pr-1 md:pr-2">${filtered.filter(t => t.status === s).map(t => html`<div key=${t.id} class="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 active:scale-95 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer mb-4"><h4 class="font-bold text-slate-800 text-sm mb-4 leading-relaxed whitespace-normal break-words">${t.vazifa}</h4><div class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider"><span class="flex items-center"><${Lucide.Calendar} size="12" class="mr-2 opacity-50" /> ${t.sana}</span><div class="flex items-center gap-2"><div class="w-12 h-1 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-brand-500 transition-all duration-500" style=${{ width: t.progress + '%' }}></div></div><span class="text-brand-500">${t.progress}%</span></div></div></div>`)}</div></div>`)}</div>
        </div>
    `;
};

// --- FILTER DROPDOWN COMPONENT ---
const FilterDropdown = ({ columnKey, tasks, activeFilters, onFilterChange, onClose }) => {
    const [search, setSearch] = useState('');
    const uniqueValues = useMemo(() => { const values = new Set(); tasks.forEach(t => { const val = t[columnKey]; values.add(val === undefined || val === null || val === '' ? "(Bo'sh)" : String(val)); }); return Array.from(values).sort(); }, [tasks, columnKey]);
    const filteredValues = uniqueValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    const selected = activeFilters[columnKey] || [];
    const handleCheckboxChange = (value) => { let newSelected; if (selected.includes(value)) { newSelected = selected.filter(v => v !== value); } else { newSelected = [...selected, value]; } onFilterChange(columnKey, newSelected.length === 0 ? null : newSelected); };
    return html`
        <div class="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-[60] animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden font-sans" onClick=${e => e.stopPropagation()}>
            <div class="p-3 border-b border-slate-100 bg-slate-50/50"><input type="text" placeholder="Qidirish..." value=${search} onChange=${e => setSearch(e.target.value)} autoFocus class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all" /></div>
            <div class="max-h-60 overflow-y-auto custom-scrollbar p-1">
                <div class="px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-2" onClick=${() => onFilterChange(columnKey, selected.length === uniqueValues.length ? null : uniqueValues)}><input type="checkbox" checked=${!activeFilters[columnKey] || activeFilters[columnKey].length === uniqueValues.length} readOnly class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" /><span class="text-xs font-bold text-slate-700">(Hammasini tanlash)</span></div>
                ${filteredValues.map(val => html`<div key=${val} class="px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-2" onClick=${() => handleCheckboxChange(val)}><input type="checkbox" checked=${!activeFilters[columnKey] || selected.includes(val)} readOnly class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" /><span class="text-xs font-medium text-slate-600 truncate" title=${val}>${val}</span></div>`)}
            </div>
            <div class="p-2 border-t border-slate-100 bg-slate-50 flex justify-between"><button onClick=${() => onFilterChange(columnKey, null)} class="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">Tozalash</button><button onClick=${onClose} class="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-brand-600 active:scale-95 transition-all">Yopish</button></div>
        </div>
    `;
};

// --- TASKS PAGE COMPONENT ---
export const TasksPage = () => {
    const { tasks = [], addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [modalTask, setModalTask] = useState(null);
    const [editCell, setEditCell] = useState({ id: null, field: null });
    const [cellValue, setCellValue] = useState('');
    
    // State Persistence
    const [sort, setSort] = useSessionState('tasks_sort', { key: 'overdue', dir: 'desc' });
    const [filters, setFilters] = useSessionState('tasks_filters', { status: ['Rejada', 'Jarayonda'] }); // Default: Hide Completed
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [hiddenColumns, setHiddenColumns] = useLocalState('tasks_hidden_cols', []);
    const [showColSettings, setShowColSettings] = useState(false);

    const startCellEdit = (task, field) => { setEditCell({ id: task.id, field }); let val = task[field]; setCellValue(val); };
    
    // Bi-directional Binding Logic in Inline Edit
    const saveCell = (overrideValue) => { 
        if (editCell.id && editCell.field) { 
            let newValue = overrideValue !== undefined ? overrideValue : cellValue;
            let updates = { [editCell.field]: newValue };

            // Logic: Status <-> Progress Binding
            if (editCell.field === 'status') {
                const currentProgress = tasks.find(t => t.id === editCell.id)?.progress || 0;
                if (newValue === 'Rejada') updates.progress = 0;
                else if (newValue === 'Jarayonda' && (currentProgress === 0 || currentProgress === 100)) updates.progress = 50;
                else if (newValue === 'Bajarildi') updates.progress = 100;
            }
            if (editCell.field === 'progress') {
                // Progress Validation (Int 0-100)
                let valStr = String(newValue).replace(/[^0-9]/g, '');
                let val = valStr === '' ? 0 : parseInt(valStr, 10);
                
                if (isNaN(val)) val = 0;
                if (val < 0) val = 0;
                if (val > 100) val = 100;
                
                newValue = val;
                updates.progress = val;

                const currentStatus = tasks.find(t => t.id === editCell.id)?.status;
                if (val === 0) updates.status = 'Rejada';
                else if (val > 0 && val < 100) updates.status = 'Jarayonda';
                else if (val === 100) updates.status = 'Bajarildi';
            }

            updateTask({ id: editCell.id, ...updates }); 
            setEditCell({ id: null, field: null }); 
            setCellValue(''); 
        } 
    };
    
    const handleFilterChange = (key, values) => {
        setFilters(prev => {
            const next = { ...prev };
            if (!values) delete next[key];
            else next[key] = values;
            return next;
        });
    };

    const processedTasks = useMemo(() => {
        let result = (tasks || []).map(t => ({ 
            ...t, 
            ...getTaskMeta(t.sana, t.dedlayn, t.status),
            // Calculate overdue specifically for sorting here to be fast
            _isOverdue: (t.status !== 'Bajarildi' && t.dedlayn && isBefore(parseISO(t.dedlayn), startOfDay(new Date())))
        }));

        // Filter
        Object.keys(filters).forEach(key => { 
            if (filters[key] && filters[key].length > 0) {
                result = result.filter(t => { 
                    const val = t[key] === undefined || t[key] === null || t[key] === '' ? "(Bo'sh)" : String(t[key]); 
                    return filters[key].includes(val); 
                }); 
            }
        });

        // Smart Sort: 1. Overdue, 2. Status Group, 3. User Sort
        result.sort((a, b) => {
            // Priority 1: Overdue (Always top if enabled default sort or user hasn't overridden excessively)
            if (a._isOverdue !== b._isOverdue) return a._isOverdue ? -1 : 1;

            // Priority 2: Status (Completed at bottom)
            const isDoneA = a.status === 'Bajarildi';
            const isDoneB = b.status === 'Bajarildi';
            if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;

            // Priority 3: User Selected Sort
            let valA = a[sort.key];
            let valB = b[sort.key];
            
            // Handle specific overrides for sorting logic (e.g. overdue key)
            if (sort.key === 'overdue') {
                 // Already handled by Priority 1, but if we want secondary sort by date
                 valA = a.dedlayn || '9999-99-99';
                 valB = b.dedlayn || '9999-99-99';
                 return valA < valB ? -1 : 1;
            }

            if (typeof valA === 'string') valA = valA.toLowerCase(); 
            if (typeof valB === 'string') valB = valB.toLowerCase(); 
            
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1; 
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1; 
            return 0; 
        });

        return result;
    }, [tasks, sort, filters]);

    const allColumns = [ 
        { key: 'id', label: 'ID', width: 'w-20' }, 
        { key: 'sana', label: 'Sana', width: 'w-32' }, 
        { key: 'vazifa', label: 'Vazifa', width: 'min-w-[300px]' }, 
        { key: 'tavsif', label: 'Tavsif', width: 'min-w-[250px]' },
        { key: 'izoh', label: 'Izoh', width: 'min-w-[200px]' }, 
        { key: 'status', label: 'Status', width: 'w-32' }, 
        { key: 'prioritet', label: 'Prioritet', width: 'w-36' }, 
        { key: 'dedlayn', label: 'Dedlayn', width: 'w-32' }, 
        { key: 'progress', label: 'Progress', width: 'w-48' } 
    ];

    const visibleColumns = allColumns.filter(c => !hiddenColumns.includes(c.key));

    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in pb-20" onClick=${() => { setActiveFilterCol(null); setShowColSettings(false); }}>
            <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Vazifalar</h2>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Jami ${tasks.length} ta yozuv (Ko'rsatilmoqda: ${processedTasks.length})
                        ${filters.status && !filters.status.includes('Bajarildi') && html`<span class="ml-2 text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md text-[9px] font-black">ACTIVE ONLY</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-3 w-full md:w-auto items-center">
                     <div class="relative">
                        <button onClick=${(e) => { e.stopPropagation(); setShowColSettings(!showColSettings); }} class="bg-white text-slate-500 border border-slate-200 px-3 py-3.5 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm" title="Ustunlarni sozlash">
                            <${Lucide.Settings2} size="18" />
                        </button>
                        ${showColSettings && html`<${ColumnSettings} allColumns=${allColumns} hiddenColumns=${hiddenColumns} setHiddenColumns=${setHiddenColumns} onClose=${() => setShowColSettings(false)} />`}
                    </div>
                    <button onClick=${() => exportToExcel(tasks)} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95"><${Lucide.FileSpreadsheet} size="18" class="mr-2 text-emerald-500" /> Excel</button>
                    <button onClick=${() => { setModalTask(null); setIsForm(true); }} class="flex-1 md:flex-none justify-center bg-brand-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95"><${Lucide.Plus} size="20" class="mr-2" /> Yangi</button>
                </div>
            </header>
            <div class="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[65vh] md:h-[70vh]"><div class="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative"><table class="w-full text-left text-[11px] border-separate border-spacing-0"><thead class="sticky top-0 z-20"><tr class="bg-slate-100 shadow-sm z-20">${visibleColumns.map(col => html`<th key=${col.key} class="${col.width} px-4 py-4 border-b border-slate-200 border-r border-slate-200/60 last:border-r-0 relative group select-none"><div class="flex items-center justify-between gap-2"><div onClick=${() => setSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === 'asc' ? 'desc' : 'asc' }))} class="flex items-center gap-1 cursor-pointer hover:text-brand-600 transition-colors uppercase font-extrabold tracking-widest text-[10px] text-slate-400 flex-1">${col.label}<${Lucide.ArrowUpDown} size="12" class="${sort.key === col.key ? 'text-brand-600 opacity-100' : 'opacity-30 group-hover:opacity-50'}" /></div><button onClick=${(e) => { e.stopPropagation(); setActiveFilterCol(activeFilterCol === col.key ? null : col.key); }} class="p-1 rounded-md hover:bg-slate-200 transition-colors ${filters[col.key] ? 'text-brand-500 bg-brand-50' : 'text-slate-300 hover:text-slate-500'}"><${Lucide.Filter} size="14" fill=${filters[col.key] ? "currentColor" : "none"} /></button></div>${activeFilterCol === col.key && html`<${FilterDropdown} columnKey=${col.key} tasks=${tasks} activeFilters=${filters} onFilterChange=${handleFilterChange} onClose=${() => setActiveFilterCol(null)} />`}</th>`)}<th class="w-24 px-4 py-4 bg-slate-100 text-right border-b border-slate-200 border-l border-slate-200/60 uppercase font-extrabold tracking-widest text-slate-400 text-[10px] sticky right-0 z-30 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)]">Amallar</th></tr></thead><tbody class="divide-y divide-slate-100">${processedTasks.map(t => html`<tr key=${t.id} class="group hover:bg-slate-50 transition-all duration-200 ${t._isOverdue ? 'bg-red-50/50 hover:bg-red-50' : ''}">
                ${!hiddenColumns.includes('id') && html`<td class="px-4 py-3 border-r border-slate-50 align-top"><div class="font-mono text-slate-300 text-[10px] select-none py-2">${t.id}</div></td>`}
                ${!hiddenColumns.includes('sana') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'sana')}>${editCell.id === t.id && editCell.field === 'sana' ? html`<input type="date" value=${cellValue} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs" />` : html`<span class="font-bold text-slate-600 block py-1.5 cursor-pointer">${t.sana}</span>`}</td>`}
                ${!hiddenColumns.includes('vazifa') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'vazifa')}>${editCell.id === t.id && editCell.field === 'vazifa' ? html`<textarea rows="2" value=${cellValue} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-800 font-bold text-xs"></textarea>` : html`<p class="font-extrabold text-slate-800 text-[12px] whitespace-normal break-words py-0.5 ${t._isOverdue ? 'text-red-700' : ''}">${t.vazifa}</p>`}</td>`}
                ${!hiddenColumns.includes('tavsif') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'tavsif')}>${editCell.id === t.id && editCell.field === 'tavsif' ? html`<textarea rows="3" value=${cellValue || ''} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-600 font-medium text-xs"></textarea>` : html`<p class="text-slate-500 text-[11px] whitespace-normal break-words py-0.5">${t.tavsif || '-'}</p>`}</td>`}
                ${!hiddenColumns.includes('izoh') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'izoh')}>${editCell.id === t.id && editCell.field === 'izoh' ? html`<textarea rows="2" value=${cellValue || ''} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-600 font-medium text-xs"></textarea>` : html`<p class="text-slate-500 text-[11px] whitespace-normal break-words py-0.5 italic">${t.izoh || '-'}</p>`}</td>`}
                ${!hiddenColumns.includes('status') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'status')}>${editCell.id === t.id && editCell.field === 'status' ? html`<select value=${cellValue} onChange=${e => saveCell(e.target.value)} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-bold"><option value="Rejada">Rejada</option><option value="Jarayonda">Jarayonda</option><option value="Bajarildi">Bajarildi</option></select>` : html`<span class="px-2.5 py-1 rounded-lg font-black uppercase text-[9px] block w-fit mt-1 ${t.status === 'Bajarildi' ? 'bg-emerald-50 text-emerald-600' : t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}">${t.status}</span>`}</td>`}
                ${!hiddenColumns.includes('prioritet') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'prioritet')}>${editCell.id === t.id && editCell.field === 'prioritet' ? html`<select value=${cellValue} onChange=${e => saveCell(e.target.value)} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-bold"><option value="Juda muhum">🔴 Juda muhum</option><option value="Muhum">🟡 Muhum</option><option value="Muhum emas">🟢 Muhum emas</option></select>` : html`<span class="font-bold flex items-center gap-2 whitespace-nowrap mt-1 ${t.prioritet === 'Juda muhum' ? 'text-red-500' : t.prioritet === 'Muhum' ? 'text-amber-500' : 'text-emerald-500'}"><span class="w-1.5 h-1.5 rounded-full bg-current"></span>${t.prioritet}</span>`}</td>`}
                ${!hiddenColumns.includes('dedlayn') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'dedlayn')}>${editCell.id === t.id && editCell.field === 'dedlayn' ? html`<input type="date" value=${cellValue} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs" />` : html`<span class="font-bold text-[10px] block py-1.5 ${t._isOverdue ? 'text-red-600 animate-pulse' : 'text-slate-500'}">${t.dedlayn || '-'} ${t._isOverdue ? '⚠️' : ''}</span>`}</td>`}
                ${!hiddenColumns.includes('progress') && html`<td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'progress')}>${editCell.id === t.id && editCell.field === 'progress' ? html`<div class="flex flex-col gap-2"><input type="number" value=${cellValue} onKeyDown=${(e) => { if(['.','e','E','-','+'].includes(e.key)) e.preventDefault(); }} onChange=${e => { let v = e.target.value; if(v > 100) v = 100; if(v < 0) v = 0; if(v.length > 1 && v.startsWith('0')) v = parseInt(v, 10); setCellValue(v); }} onBlur=${() => saveCell()} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs" /><input type="range" min="0" max="100" value=${cellValue || 0} onInput=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500" /></div>` : html`<div class="flex items-center gap-3 py-1.5"><div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[50px]"><div class="h-full bg-brand-500 transition-all duration-500" style=${{ width: t.progress + '%' }}></div></div><span class="font-black text-brand-500 text-[10px]">${t.progress}%</span></div>`}</td>`}
                <td class="px-4 py-3 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-all align-top"><div class="flex justify-end gap-1 py-1"><button onClick=${() => { setModalTask(t); setIsForm(true); }} class="p-2 text-brand-400 hover:text-brand-600 rounded-lg"><${Lucide.Pencil} size="14" /></button><button onClick=${() => deleteTask(t.id)} class="p-2 text-slate-300 hover:text-red-500 rounded-lg"><${Lucide.Trash2} size="14" /></button></div></td></tr>`)}</tbody></table></div></div>
            <${Modal} isOpen=${isForm} onClose=${() => { setIsForm(false); setModalTask(null); }} title=${modalTask ? "Vazifani tahrirlash" : "Yangi vazifa"}><${TaskForm} task=${modalTask} onSubmit=${(d) => { if(modalTask) updateTask(d); else addTask(d); setIsForm(false); setModalTask(null); }} onCancel=${() => { setIsForm(false); setModalTask(null); }} /><//>
        </div>
    `;
};

// --- TRASH PAGE COMPONENT ---
export const TrashPage = () => {
    const { deletedTasks = [], restoreTask, clearTrash } = useContext(TaskContext);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleClear = () => {
        clearTrash();
        setIsConfirmOpen(false);
    };

    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in">
            <header class="flex justify-between items-center">
                <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Savat</h2>
                <button 
                    onClick=${() => (deletedTasks.length > 0 && setIsConfirmOpen(true))} 
                    class="text-red-500 font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 px-4 md:px-6 py-2 md:py-3 rounded-2xl transition-all active:scale-95">
                    Tozalash
                </button>
            </header>

            <${Modal} isOpen=${isConfirmOpen} onClose=${() => setIsConfirmOpen(false)} title="Tozalashni tasdiqlang">
                <div class="text-center py-6">
                    <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <${Lucide.AlertTriangle} size="32" />
                    </div>
                    <h4 class="text-lg font-black text-slate-800 mb-2">Ishonchingiz komilmi?</h4>
                    <p class="text-sm text-slate-400 font-bold mb-8">
                        Savatdagi <span class="text-red-500 font-black">${deletedTasks.length} ta vazifa</span> ma'lumotlar omboridan butunlay o'chiriladi. Ushbu amalni ortga qaytarib bo'lmaydi.
                    </p>
                    <div class="flex gap-4">
                        <button onClick=${() => setIsConfirmOpen(false)} class="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-slate-500 uppercase tracking-widest text-xs">Bekor qilish</button>
                        <button onClick=${handleClear} class="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-xl shadow-red-500/20 uppercase tracking-widest text-xs">Ha, butunlay o'chirilsin</button>
                    </div>
                </div>
            <//>

            <div class="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                ${(deletedTasks || []).length === 0 ? html`<div class="py-20 flex flex-col items-center justify-center opacity-20 grayscale"><${Lucide.Recycle} size="60" strokeWidth="1" class="mb-6" /><p class="font-bold uppercase tracking-widest text-xs">Savat bo'sh</p></div>` : html`
                    <div class="divide-y divide-slate-50">
                        ${deletedTasks.map(t => html`
                            <div key=${t.id} class="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-all group">
                                <div class="flex items-center gap-4 md:gap-6"><div class="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-red-400 transition-all shrink-0"><${Lucide.FileX} size="20" /></div><div><p class="font-bold text-slate-800 text-base md:text-lg group-hover:text-red-600 transition-colors line-clamp-1">${t.vazifa}</p><p class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">${t.status} • ID: ${t.id}</p></div></div>
                                <button onClick=${() => restoreTask(t.id)} class="w-full md:w-auto bg-brand-50 text-brand-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-brand-900 hover:text-white transition-all shadow-sm active:scale-95">Tiklash</button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};

// --- HELP PAGE COMPONENT ---
export const HelpPage = () => {
    const manualSteps = [
        {
            title: "Monitoring (Dashboard)",
            icon: "LayoutDashboard",
            steps: [
                "Asosiy ekran statistika (KPI) kartalarini ko'rsatadi.",
                "Sana filtridan foydalanib, ma'lum davr bo'yicha hisobotlarni ko'ring.",
                "Eksport (PNG/PDF) tugmalari orqali vizual hisobotni saqlab oling."
            ]
        },
        {
            title: "Vazifalar (Tasks)",
            icon: "ListTodo",
            steps: [
                "'Yangi' tugmasi orqali vazifa qo'shing.",
                "Jadvaldagi istalgan katakchani bosib, uni joyida tahrirlang (Inline edit).",
                "Excel tugmasi orqali barcha ma'lumotlarni jadval ko'rinishida yuklang."
            ]
        },
        {
            title: "Savat va Xavfsizlik",
            icon: "Trash2",
            steps: [
                "O'chirilgan vazifalar avval Savatga tushadi.",
                "Savatdan vazifani qayta tiklash yoki 'Tozalash' orqali butunlay o'chirish mumkin.",
                "Ma'lumotlar avtomatik tarzda Google hisobingiz bilan sinxronlanadi."
            ]
        }
    ];

    return html`
        <div class="space-y-8 md:space-y-12 animate-fade-in pb-20">
            <header>
                <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Yordam va Yo'riqnomalar</h2>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Tizimdan professional foydalanish markazi</p>
            </header>

            <div class="bg-brand-900 p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl shadow-brand-900/40 relative overflow-hidden group">
                <div class="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <${Lucide.Headset} size="200" />
                </div>
                <div class="relative z-10">
                    <div class="flex items-center gap-3 mb-6">
                        <span class="px-3 py-1 bg-teal-400 text-brand-900 text-[9px] font-black uppercase rounded-lg tracking-widest">Support Online</span>
                    </div>
                    <h3 class="text-2xl md:text-3xl font-black mb-4 tracking-tight">Texnik yordam kerakmi?</h3>
                    <p class="text-teal-100/60 font-medium mb-8 max-w-md">Agar tizim bilan bog'liq muammo yoki takliflaringiz bo'lsa, mutaxassisimiz bilan bog'laning.</p>
                    
                    <div class="flex flex-col sm:flex-row gap-4">
                        <a href="tel:+998999004430" class="flex items-center justify-center gap-3 bg-white text-brand-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all active:scale-95">
                            <${Lucide.Phone} size="18" /> +998 99 900 44 30
                        </a>
                        <a href="https://t.me/xisobotpro_admin" target="_blank" class="flex items-center justify-center gap-3 bg-teal-500/20 border border-teal-500/30 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-500/40 transition-all active:scale-95">
                            <${Lucide.Send} size="18" /> Telegram
                        </a>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                ${manualSteps.map(m => html`
                    <div key=${m.title} class="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div class="w-12 h-12 bg-slate-50 text-brand-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <${Lucide[m.icon]} size="24" />
                        </div>
                        <h4 class="text-lg font-black text-slate-800 mb-6 tracking-tight">${m.title}</h4>
                        <div class="space-y-4">
                            ${m.steps.map((step, idx) => html`
                                <div key=${idx} class="flex gap-4">
                                    <span class="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">${idx + 1}</span>
                                    <p class="text-slate-500 text-sm font-medium leading-relaxed">${step}</p>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}
            </div>
            
            <div class="text-center py-10 opacity-30">
                <p class="text-[10px] font-black uppercase tracking-[0.4em]">Xisobot PRO - Sizning raqamli yordamchingiz</p>
            </div>
        </div>
    `;
};
