
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
        // UI render va animatsiyalar tinchlanishi uchun pauzani oshiramiz
        await new Promise(r => setTimeout(r, 600));
        
        const element = document.getElementById('dashboard-content');
        if (element) {
            try {
                const canvas = await html2canvas(element, { 
                    scale: 3, // Yuqori aniqlik (Retina sifat)
                    backgroundColor: '#f8fafc', // Fon rangini qat'iy belgilaymiz
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    onclone: (clonedDoc) => { 
                        const el = clonedDoc.getElementById('dashboard-content'); 
                        if (el) { 
                            el.style.padding = '40px'; 
                            el.style.backgroundColor = '#f8fafc';
                            
                            // Barcha elementlardagi animatsiya va faded effekti keltirib chiqaruvchi xususiyatlarni tozalaymiz
                            el.querySelectorAll('*').forEach(s => { 
                                s.style.animation = 'none'; 
                                s.style.transition = 'none';
                                s.style.opacity = '1'; // Shaffoflikni to'liq qilamiz
                            });

                            // Soyalarni renderga moslash
                            el.querySelectorAll('.shadow-sm, .shadow-md, .shadow-xl').forEach(sh => {
                                sh.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
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
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
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

                    pdf.addImage(imgData, 'JPEG', x, y, iw, ih, undefined, 'SLOW'); 
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
// ... qolgan kod o'zgarishsiz qoladi ...
