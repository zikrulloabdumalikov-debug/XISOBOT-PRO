
import React, { useState, useContext, useMemo } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { 
    isValid, format, 
    startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
    addYears, subYears, startOfYear, endOfYear,
    isWithinInterval, parseISO
} from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TaskContext } from './store.js';
import { KPICard } from './ui.js';
import { CustomCalendar } from './calendar.js';
import { KPISkeleton } from './components/skeletons.js';

const html = htm.bind(React.createElement);

const safeFormat = (date, fmt, fallback = "") => {
    if (!date || !isValid(date)) return fallback;
    try { return format(date, fmt); } catch (e) { return fallback; }
};

// --- CUSTOM TOOLTIP ---
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return html`
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">${label}</p>
                <p class="text-sm font-black text-slate-800 dark:text-white">
                    ${payload[0].name || 'Soni'}: <span class="text-brand-600 dark:text-brand-400">${payload[0].value}</span>
                </p>
            </div>
        `;
    }
    return null;
};

// --- CHARTS COMPONENT ---
const StatsCharts = ({ tasks, filteredStats }) => {
    // 1. PIE DATA (Based on filtered view)
    const pieData = [
        { name: 'Bajarildi', value: filteredStats.done, color: '#059669' }, // emerald-600
        { name: 'Jarayonda', value: filteredStats.doing, color: '#d97706' }, // amber-600
        { name: 'Rejada', value: filteredStats.todo, color: '#4f46e5' }, // indigo-600
    ].filter(d => d.value > 0);

    // 2. BAR DATA (Last 4 weeks trend - Independent of filter)
    const barData = useMemo(() => {
        const weeks = [];
        const today = new Date();
        
        for (let i = 3; i >= 0; i--) {
            const start = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
            const end = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
            
            const count = tasks.filter(t => {
                if (t.status !== 'Bajarildi' || !t.sana) return false;
                try {
                    const d = parseISO(t.sana);
                    return isValid(d) && isWithinInterval(d, { start, end });
                } catch { return false; }
            }).length;

            weeks.push({
                name: format(start, 'dd.MM'),
                soni: count
            });
        }
        return weeks;
    }, [tasks]);

    return html`
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8" data-html2canvas-ignore="true">
            <!-- PIE CHART -->
            <div class="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <h3 class="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4">Holat bo'yicha (Joriy)</h3>
                <div class="h-64 relative z-10">
                    <${ResponsiveContainer} width="100%" height="100%">
                        <${PieChart}>
                            <${Pie}
                                data=${pieData}
                                innerRadius=${60}
                                outerRadius=${80}
                                paddingAngle=${5}
                                dataKey="value"
                            >
                                ${pieData.map((entry, index) => html`<${Cell} key=${`cell-${index}`} fill=${entry.color} strokeWidth=${0} />`)}
                            <//>
                            <${Tooltip} content=${html`<${CustomTooltip} />`} />
                        <//>
                    <//>
                    <!-- Center Label -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span class="text-3xl font-black text-slate-800 dark:text-white">${filteredStats.total}</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jami</span>
                    </div>
                </div>
                <div class="flex justify-center gap-4 mt-2">
                    ${pieData.map(d => html`
                        <div key=${d.name} class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full" style=${{ backgroundColor: d.color }}></span>
                            <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">${d.name}</span>
                        </div>
                    `)}
                </div>
            </div>

            <!-- BAR CHART -->
            <div class="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 class="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4">Haftalik Progress (Topshirildi)</h3>
                <div class="h-64">
                    <${ResponsiveContainer} width="100%" height="100%">
                        <${BarChart} data=${barData} margin=${{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <${XAxis} 
                                dataKey="name" 
                                axisLine=${false} 
                                tickLine=${false} 
                                tick=${{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} 
                                dy=${10}
                            />
                            <${YAxis} 
                                axisLine=${false} 
                                tickLine=${false} 
                                tick=${{ fontSize: 10, fill: '#94a3b8' }} 
                            />
                            <${Tooltip} cursor=${{fill: 'transparent'}} content=${html`<${CustomTooltip} />`} />
                            <${Bar} 
                                dataKey="soni" 
                                name="Bajarildi" 
                                fill="#0d9488" 
                                radius=${[6, 6, 6, 6]} 
                                barSize=${32}
                            />
                        <//>
                    <//>
                </div>
            </div>
        </div>
    `;
};

// --- MAIN DASHBOARD COMPONENT ---
export const Dashboard = () => {
    // Added 'loading' from context
    const { tasks = [], loading } = useContext(TaskContext);
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
                // Dynamic Imports for Performance
                const html2canvas = (await import('html2canvas')).default;
                const { jsPDF } = await import('jspdf');

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
                            
                            // Dark Mode Reset for PDF/PNG export (Force Light)
                            if (document.documentElement.classList.contains('dark')) {
                                el.style.backgroundColor = '#f8fafc';
                                el.style.color = '#0f172a';
                            }
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
                // Error handling silent
            }
        }
        setIsExporting(false);
    };

    const filtered = (tasks || []).filter(t => { if (!t?.sana) return false; try { const d = parseISO(t.sana); return isValid(d) && isWithinInterval(d, { start: range.start, end: range.end }); } catch(e) { return false; } });
    const stats = { done: filtered.filter(t => t.status === 'Bajarildi').length, doing: filtered.filter(t => t.status === 'Jarayonda').length, todo: filtered.filter(t => t.status === 'Rejada').length, total: filtered.length };

    return html`
        <div id="dashboard-content" class="space-y-6 md:space-y-10 animate-fade-in p-1 bg-[#f8fafc] dark:bg-slate-900 transition-colors">
            <header class="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 relative">
                <div><div class="flex items-center gap-2 mb-1"><span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span><p class="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-[0.3em]">Tizim Faol</p></div><h2 class="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">Monitoring</h2></div>
                <div class="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center" data-html2canvas-ignore="true">
                    ${!isExporting && html`<div class="flex gap-2 w-full md:w-auto mr-2"><button onClick=${() => handleDownload('png')} aria-label="PNG yuklab olish" class="flex-1 md:flex-none justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95 uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"><${Lucide.Image} size="16" class="mr-2 text-blue-500" /> PNG</button><button onClick=${() => handleDownload('pdf')} aria-label="PDF yuklab olish" class="flex-1 md:flex-none justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95 uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"><${Lucide.FileDown} size="16" class="mr-2 text-red-500" /> PDF</button></div>`}
                    <div class="flex flex-col md:flex-row bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-2 w-full md:w-auto shadow-inner relative">
                        ${preset !== 'jami' && html`<div class="flex items-center justify-between bg-white dark:bg-slate-700 rounded-xl px-2 py-1 shadow-sm border border-slate-200/50 dark:border-slate-600 w-full md:w-auto"><button onClick=${() => handleNavigate('prev')} aria-label="Oldingi davr" class="p-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg text-slate-500 dark:text-slate-300 transition-colors active:scale-90 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${preset === 'ixtiyoriy' ? 'opacity-20 cursor-not-allowed' : ''}"><${Lucide.ChevronLeft} size="16" strokeWidth="3" /></button><div onClick=${() => setIsCalOpen(!isCalOpen)} class="group flex items-center justify-center cursor-pointer px-4 h-full min-w-[150px] select-none" role="button" aria-label="${"Sanani o'zgartirish: " + range.label}"><span class="text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider whitespace-nowrap text-center group-hover:text-brand-500 transition-colors">${range.label}</span><${Lucide.Edit3} size="14" class="ml-2 text-slate-300 group-hover:text-brand-500 transition-all ${preset === 'ixtiyoriy' ? 'text-brand-500' : ''}" /></div><button onClick=${() => handleNavigate('next')} aria-label="Keyingi davr" class="p-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg text-slate-500 dark:text-slate-300 transition-colors active:scale-90 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${preset === 'ixtiyoriy' ? 'opacity-20 cursor-not-allowed' : ''}"><${Lucide.ChevronRight} size="16" strokeWidth="3" /></button></div>`}
                        <${CustomCalendar} isOpen=${isCalOpen} onClose=${() => setIsCalOpen(false)} range=${range} onRangeChange=${handleDateFromCalendar} preset=${preset} />
                        <div class="flex bg-white dark:bg-slate-700 rounded-xl p-1 shadow-sm border border-slate-200/50 dark:border-slate-600 w-full md:w-auto overflow-x-auto gap-0.5">${['kun', 'hafta', 'oy', 'yil', 'ixtiyoriy', 'jami'].map(p => html`<button key=${p} onClick=${() => { setPreset(p); if(p!=='ixtiyoriy') setIsCalOpen(false); }} class="px-3 md:px-4 py-2 text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${preset === p ? 'bg-teal-700 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}">${p}</button>`)}</div>
                    </div>
                </div>
            </header>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                ${loading 
                    ? Array(4).fill(0).map((_, i) => html`<${KPISkeleton} key=${i} />`) 
                    : html`<${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-emerald-600" /><${KPICard} label="Jarayonda" count=${stats.doing} icon="Activity" color="text-amber-600" /><${KPICard} label="Rejada" count=${stats.todo} icon="Compass" color="text-indigo-600" /><${KPICard} label="Jami" count=${stats.total} icon="BarChart3" color="text-teal-600" />`
                }
            </div>

            <!-- CHARTS SECTION -->
            ${!loading && html`<${StatsCharts} tasks=${tasks} filteredStats=${stats} />`}
            
            <!-- Performance: Added [content-visibility:auto] (cv-auto) for off-screen rendering optimization -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-10 cv-auto">${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`<div key=${s} class="bg-slate-100/50 dark:bg-slate-800/50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200/50 dark:border-slate-700/50 min-h-[300px] md:min-h-[500px] flex flex-col"><div class="flex items-center justify-between mb-6 md:mb-8 px-2"><h3 class="text-[10px] md:text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest">${s}</h3><span class="bg-white dark:bg-slate-700 text-[10px] md:text-[11px] font-black px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm text-slate-700 dark:text-slate-200">${filtered.filter(t => t.status === s).length}</span></div><div class="space-y-4 md:y-5 flex-1 ${!isExporting ? 'overflow-y-auto custom-scrollbar max-h-[400px] md:max-h-none' : ''} pr-1 md:pr-2">${filtered.filter(t => t.status === s).map(t => html`<div key=${t.id} class="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer mb-4"><h4 class="font-bold text-slate-800 dark:text-white text-sm mb-4 leading-relaxed whitespace-normal break-words">${t.vazifa}</h4><div class="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><span class="flex items-center"><${Lucide.Calendar} size="12" class="mr-2 opacity-50" /> ${t.sana}</span><div class="flex items-center gap-2"><div class="w-12 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-teal-500 transition-all duration-500" style=${{ width: t.progress + '%' }}></div></div><span class="text-teal-600 dark:text-teal-400">${t.progress}%</span></div></div></div>`)}</div></div>`)}</div>
        </div>
    `;
};
