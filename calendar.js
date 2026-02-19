
import React, { useState } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { 
    isValid, format, 
    startOfDay, endOfDay, startOfMonth, endOfMonth,
    addMonths, subMonths, 
    startOfMonth as dFnsStartOfMonth, eachDayOfInterval,
    isSameDay, isAfter, isBefore, setMonth, addYears, subYears,
    isWithinInterval
} from 'date-fns';

const html = htm.bind(React.createElement);

const safeFormat = (date, fmt, fallback = "") => {
    if (!date || !isValid(date)) return fallback;
    try { return format(date, fmt); } catch (e) { return fallback; }
};

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
        if (!isValid(start) || !isValid(end)) return 'text-slate-500 dark:text-slate-500';
        const isStart = isSameDay(day, start);
        const isEnd = isSameDay(day, end);
        let inInterval = false;
        try { inInterval = isWithinInterval(day, { start, end }); } catch (e) { inInterval = false; }
        if (isStart && isEnd) return 'bg-teal-700 text-white rounded-lg font-black z-10'; // Darker Brand
        if (isStart) return 'bg-teal-700 text-white rounded-l-lg font-black z-10';
        if (isEnd) return 'bg-teal-700 text-white rounded-r-lg font-black z-10';
        if (inInterval) return 'bg-brand-50 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold'; // Better contrast
        return 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg';
    };

    return html`
        <div class="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-default text-[9px] select-none">
            <h4 class="font-black text-slate-800 dark:text-slate-200 mb-2 text-center uppercase tracking-wider">${monthName}</h4>
            <div class="grid grid-cols-7 gap-0.5 text-center text-slate-400 dark:text-slate-500 font-bold mb-1">
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

export const CustomCalendar = ({ isOpen, onClose, range, onRangeChange, preset }) => {
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
            <div class="relative bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden w-[320px] md:w-[680px] flex flex-col max-h-[85vh]">
                <div class="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <button onClick=${() => navigate('year', 'prev')} aria-label="Oldingi yil" class="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 dark:text-slate-300 active:scale-90 transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
                            <${Lucide.ChevronLeft} size="16" />
                        </button>
                        <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tighter">${safeFormat(viewDate, 'yyyy')}</h3>
                        <button onClick=${() => navigate('year', 'next')} aria-label="Keyingi yil" class="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 dark:text-slate-300 active:scale-90 transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
                            <${Lucide.ChevronRight} size="16" />
                        </button>
                    </div>
                    <div class="flex bg-white dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 shadow-inner">
                        <button onClick=${() => setViewMode('month')} class="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${viewMode === 'month' ? 'bg-teal-700 text-white shadow-md' : 'text-slate-400 dark:text-slate-300'}">Oy</button>
                        <button onClick=${() => setViewMode('year')} class="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${viewMode === 'year' ? 'bg-teal-700 text-white shadow-md' : 'text-slate-400 dark:text-slate-300'}">Yil</button>
                    </div>
                </div>
                <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-800">
                    ${preset === 'ixtiyoriy' && html`<div class="mb-4 bg-brand-50 dark:bg-brand-900/30 p-3 rounded-2xl flex items-center justify-between border border-brand-100 dark:border-brand-800 animate-pulse"><span class="text-[10px] font-black text-brand-700 dark:text-brand-400 uppercase tracking-widest">${selectingStart ? "Yakuniy sanani tanlang..." : "Boshlanish sanasini tanlang..."}</span><${Lucide.Edit3} size="14" class="text-brand-500" /></div>`}
                    ${viewMode === 'year' ? html`<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${Array.from({ length: 12 }).map((_, i) => html`<div key=${i} class="scale-95 hover:scale-100 transition-transform"><${MiniMonth} monthDate=${setMonth(new Date(viewDate), i)} range=${range} onSelect=${handleDateClick} /></div>`)}</div>` : html`<div class="flex flex-col gap-6"><div class="flex items-center justify-between px-2"><button onClick=${() => navigate('month', 'prev')} aria-label="Oldingi oy" class="p-2 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400"><${Lucide.ArrowLeft} size="18" /></button><span class="font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] text-xs">${safeFormat(viewDate, 'MMMM yyyy')}</span><button onClick=${() => navigate('month', 'next')} aria-label="Keyingi oy" class="p-2 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400"><${Lucide.ArrowRight} size="18" /></button></div><div class="scale-110 origin-top"><${MiniMonth} monthDate=${viewDate} range=${range} onSelect=${handleDateClick} /></div></div>`}
                </div>
                <div class="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-center gap-2"><button onClick=${() => { onRangeChange({ start: new Date(), end: new Date() }); onClose(); }} class="px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all tracking-widest focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">Bugun</button><button onClick=${onClose} class="px-10 py-2 bg-brand-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all tracking-widest shadow-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">Tayyor</button></div>
            </div>
        </div>
    `;
};
