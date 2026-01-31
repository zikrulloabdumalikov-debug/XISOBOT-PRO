
import React, { useState, useContext, useMemo } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { 
    parseISO, isWithinInterval, isValid, format, 
    startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addDays, subDays, addWeeks, subWeeks, addMonths, subMonths 
} from 'date-fns';
import { TaskContext } from './store.js';
import { KPICard, Modal, TaskForm } from './ui.js';
import { exportToExcel, getTaskMeta } from './utils.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const html = htm.bind(React.createElement);

export const Dashboard = () => {
    const { tasks = [] } = useContext(TaskContext);
    const [preset, setPreset] = useState('hafta'); // bugun, hafta, oy, jami
    const [currentDate, setCurrentDate] = useState(new Date()); // Tanlangan sana nuqtasi
    const [isExporting, setIsExporting] = useState(false);
    
    // Sana oralig'ini hisoblash
    const range = useMemo(() => {
        const d = currentDate;
        switch (preset) {
            case 'bugun': 
                return { start: startOfDay(d), end: endOfDay(d), label: format(d, 'dd.MM.yyyy') };
            case 'hafta': 
                return { 
                    start: startOfWeek(d, { weekStartsOn: 1 }), 
                    end: endOfWeek(d, { weekStartsOn: 1 }),
                    label: `${format(startOfWeek(d, { weekStartsOn: 1 }), 'dd.MM')} - ${format(endOfWeek(d, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`
                };
            case 'oy': 
                return { 
                    start: startOfMonth(d), 
                    end: endOfMonth(d),
                    label: format(d, 'MMMM yyyy')
                };
            case 'jami':
                return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31), label: "Barcha davr" };
            default:
                return { start: startOfDay(d), end: endOfDay(d), label: "" };
        }
    }, [preset, currentDate]);

    // Navigatsiya (Orqaga/Oldinga)
    const handleNavigate = (direction) => {
        if (preset === 'jami') return;
        const amount = direction === 'next' ? 1 : -1;
        
        if (preset === 'bugun') setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
        if (preset === 'hafta') setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
        if (preset === 'oy') setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const handlePresetChange = (p) => {
        setPreset(p);
        setCurrentDate(new Date()); // Filtr o'zgarganda bugungi kunga qaytish
    };

    const filtered = useMemo(() => {
        return (tasks || []).filter(t => {
            if (!t?.sana) return false;
            try { 
                const d = parseISO(t.sana);
                return isValid(d) && isWithinInterval(d, { start: range.start, end: range.end }); 
            }
            catch (e) { return false; }
        });
    }, [tasks, range]);

    const stats = {
        done: filtered.filter(t => t.status === 'Bajarildi').length,
        doing: filtered.filter(t => t.status === 'Jarayonda').length,
        todo: filtered.filter(t => t.status === 'Rejada').length,
        total: filtered.length
    };

    const handleDownload = async (type) => {
        setIsExporting(true);
        const element = document.getElementById('dashboard-content');
        await new Promise(r => setTimeout(r, 100));

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#f8fafc',
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            if (type === 'png') {
                const link = document.createElement('a');
                link.download = `xisobot_${preset}_${format(currentDate, 'dd-MM-yyyy')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else if (type === 'pdf') {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`xisobot_${preset}_${format(currentDate, 'dd-MM-yyyy')}.pdf`);
            }
        } catch (err) {
            console.error("Export error:", err);
            alert("Xatolik yuz berdi");
        } finally {
            setIsExporting(false);
        }
    };

    return html`
        <div id="dashboard-content" class="space-y-6 md:space-y-10 animate-fade-in p-1">
            <header class="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                        <p class="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Tizim Faol</p>
                    </div>
                    <h2 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Monitoring</h2>
                </div>
                
                <div class="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
                    ${!isExporting && html`
                        <div class="flex gap-2 w-full md:w-auto">
                            <button onClick=${() => handleDownload('png')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-wider">
                                <${Lucide.Image} size="16" class="mr-2 text-blue-500" /> PNG
                            </button>
                            <button onClick=${() => handleDownload('pdf')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-wider">
                                <${Lucide.FileDown} size="16" class="mr-2 text-red-500" /> PDF
                            </button>
                        </div>
                    `}
                    
                    <div class="flex flex-col md:flex-row bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto shadow-inner">
                        ${preset !== 'jami' && html`
                            <div class="flex items-center justify-between bg-white rounded-xl px-2 py-1 shadow-sm border border-slate-200/50 w-full md:w-auto">
                                <button onClick=${() => handleNavigate('prev')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors active:scale-90">
                                    <${Lucide.ChevronLeft} size="16" strokeWidth="3" />
                                </button>
                                <span class="mx-3 text-xs font-black text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[100px] text-center">
                                    ${range.label}
                                </span>
                                <button onClick=${() => handleNavigate('next')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors active:scale-90">
                                    <${Lucide.ChevronRight} size="16" strokeWidth="3" />
                                </button>
                            </div>
                        `}

                        <div class="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200/50 w-full md:w-auto overflow-x-auto">
                            ${['bugun', 'hafta', 'oy', 'jami'].map(p => html`
                                <button key=${p} onClick=${() => handlePresetChange(p)} 
                                        class="flex-1 md:flex-none px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 ${preset === p ? 'bg-brand-500 text-white shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}">
                                    ${p}
                                </button>
                            `)}
                        </div>
                    </div>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-emerald-500" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Activity" color="text-amber-500" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Compass" color="text-indigo-500" />
                <${KPICard} label="Jami" count=${stats.total} icon="BarChart3" color="text-brand-500" />
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-10">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div key=${s} class="bg-slate-100/50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200/50 min-h-[300px] md:min-h-[500px] flex flex-col">
                        <div class="flex items-center justify-between mb-6 md:mb-8 px-2">
                            <h3 class="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">${s}</h3>
                            <span class="bg-white text-[10px] md:text-[11px] font-black px-3 py-1 rounded-xl border border-slate-200 shadow-sm">${filtered.filter(t => t.status === s).length}</span>
                        </div>
                        <div class="space-y-4 md:space-y-5 flex-1 ${!isExporting ? 'overflow-y-auto custom-scrollbar max-h-[400px] md:max-h-none' : ''} pr-1 md:pr-2">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div key=${t.id} class="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 active:scale-95 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer mb-4">
                                    <h4 class="font-bold text-slate-800 text-sm mb-4 leading-relaxed line-clamp-2">${t.vazifa}</h4>
                                    <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span class="flex items-center"><${Lucide.Calendar} size="12" class="mr-2 opacity-50" /> ${t.sana}</span>
                                        <div class="flex items-center gap-2">
                                            <div class="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div class="h-full bg-brand-500" style=${{ width: t.progress + '%' }}></div>
                                            </div>
                                            <span class="text-brand-500">${t.progress}%</span>
                                        </div>
                                    </div>
                                </div>
                            `)}
                            ${filtered.filter(t => t.status === s).length === 0 && html`
                                <div class="text-center py-10 opacity-30">
                                    <p class="text-[10px] uppercase font-bold tracking-widest">Bo'sh</p>
                                </div>
                            `}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

export const TasksPage = () => {
    const { tasks = [], addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [edit, setEdit] = useState(null);
    const [sort, setSort] = useState({ key: 'id', dir: 'desc' });
    const [filters, setFilters] = useState({});

    const handleSort = (key) => {
        setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const handleFilter = (key, val) => {
        setFilters(prev => ({ ...prev, [key]: val.toLowerCase() }));
    };

    const processedTasks = useMemo(() => {
        let result = (tasks || []).map(t => ({ ...t, ...getTaskMeta(t.sana, t.dedlayn, t.status) }));
        
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                result = result.filter(t => String(t[key] || '').toLowerCase().includes(filters[key]));
            }
        });

        result.sort((a, b) => {
            let valA = a[sort.key];
            let valB = b[sort.key];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [tasks, sort, filters]);

    const columns = [
        { key: 'id', label: 'ID', width: 'min-w-[80px]' },
        { key: 'sana', label: 'Sana', width: 'min-w-[120px]' },
        { key: 'vazifa', label: 'Vazifa', width: 'min-w-[250px]' },
        { key: 'status', label: 'Status', width: 'min-w-[140px]' },
        { key: 'prioritet', label: 'Prioritet', width: 'min-w-[150px]' },
        { key: 'dedlayn', label: 'Dedlayn', width: 'min-w-[120px]' },
        { key: 'progress', label: 'Progress', width: 'min-w-[120px]' }
    ];

    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in pb-20">
            <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Vazifalar</h2>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Jami ${tasks.length} ta yozuv</p>
                </div>
                <div class="flex flex-wrap gap-3 w-full md:w-auto">
                    <button onClick=${() => exportToExcel(tasks)} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                        <${Lucide.FileSpreadsheet} size="18" class="mr-2 text-emerald-500" /> Excel
                    </button>
                    <button onClick=${() => { setEdit(null); setIsForm(true); }} class="flex-1 md:flex-none justify-center bg-brand-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95">
                        <${Lucide.Plus} size="20" class="mr-2" /> Yangi
                    </button>
                </div>
            </header>

            <div class="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[65vh] md:h-[70vh]">
                <div class="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
                    <table class="w-full text-left text-[11px] border-separate border-spacing-0">
                        <thead class="sticky top-0 z-20">
                            <tr class="bg-slate-100 shadow-sm z-20">
                                ${columns.map(col => html`
                                    <th key=${col.key} class="${col.width} px-4 md:px-6 py-4 border-b border-slate-200 border-r border-slate-200/60 last:border-r-0">
                                        <div class="flex flex-col gap-2">
                                            <button onClick=${() => handleSort(col.key)} class="flex items-center group text-slate-700 hover:text-brand-600 transition-colors uppercase font-extrabold tracking-widest text-[10px]">
                                                ${col.label}
                                                <${Lucide.ArrowUpDown} size="12" class="ml-2 ${sort.key === col.key ? 'opacity-100 text-brand-600' : 'opacity-30 group-hover:opacity-100'}" />
                                            </button>
                                            <input type="text" placeholder="" 
                                                onChange=${e => handleFilter(col.key, e.target.value)}
                                                class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-300 shadow-sm" />
                                        </div>
                                    </th>
                                `)}
                                <th class="w-24 px-4 md:px-6 py-4 bg-slate-100 text-right border-b border-slate-200 border-l border-slate-200/60 uppercase font-extrabold tracking-widest text-slate-700 text-[10px] sticky right-0 z-30 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)]">
                                    Amallar
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${processedTasks.map(t => html`
                                <tr key=${t.id} class="hover:bg-slate-50/80 transition-all duration-200 group">
                                    <td class="px-4 md:px-6 py-4 font-mono text-slate-400 border-r border-slate-50">${t.id}</td>
                                    <td class="px-4 md:px-6 py-4 font-bold text-slate-600 border-r border-slate-50 whitespace-nowrap">${t.sana}</td>
                                    <td class="px-4 md:px-6 py-4 border-r border-slate-50">
                                        <div class="max-w-[200px] md:max-w-md">
                                            <p class="font-extrabold text-slate-800 text-[12px] leading-snug line-clamp-2">${t.vazifa}</p>
                                            ${t.tavsif && html`<p class="text-[10px] text-slate-400 mt-1 line-clamp-1">${t.tavsif}</p>`}
                                        </div>
                                    </td>
                                    <td class="px-4 md:px-6 py-4 border-r border-slate-50">
                                        <span class="px-2.5 py-1 rounded-lg font-black uppercase text-[9px] whitespace-nowrap ${
                                            t.status === 'Bajarildi' ? 'bg-emerald-50 text-emerald-600' : 
                                            t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                        }">${t.status}</span>
                                    </td>
                                    <td class="px-4 md:px-6 py-4 border-r border-slate-50">
                                        <span class="font-bold flex items-center gap-2 whitespace-nowrap ${
                                            t.prioritet === 'Juda muhum' ? 'text-red-500' :
                                            t.prioritet === 'Muhum' ? 'text-amber-500' : 'text-emerald-500'
                                        }">
                                            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                                            ${t.prioritet}
                                        </span>
                                    </td>
                                    <td class="px-4 md:px-6 py-4 font-bold text-slate-500 border-r border-slate-50 whitespace-nowrap">${t.dedlayn || '-'}</td>
                                    <td class="px-4 md:px-6 py-4 border-r border-slate-50">
                                        <div class="flex items-center gap-3">
                                            <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[50px]">
                                                <div class="h-full bg-brand-500 transition-all duration-500" style=${{ width: t.progress + '%' }}></div>
                                            </div>
                                            <span class="font-black text-brand-500 text-[10px]">${t.progress}%</span>
                                        </div>
                                    </td>
                                    <td class="px-4 md:px-6 py-4 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-all shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.1)]">
                                        <div class="flex justify-end gap-1">
                                            <button onClick=${() => { setEdit(t); setIsForm(true); }} class="p-2 text-brand-500 hover:bg-brand-50 rounded-xl transition-all active:scale-90" title="Tahrirlash"><${Lucide.Pencil} size="15" /><//>
                                            <button onClick=${() => deleteTask(t.id)} class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90" title="O'chirish"><${Lucide.Trash2} size="15" /><//>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
                ${processedTasks.length === 0 && html`
                    <div class="py-20 flex flex-col items-center justify-center opacity-30 text-center flex-1">
                        <${Lucide.SearchX} size="48" strokeWidth="1" class="mb-4" />
                        <p class="font-bold uppercase tracking-widest text-[10px]">Ma'lumot topilmadi</p>
                    </div>
                `}
            </div>

            <${Modal} isOpen=${isForm} onClose=${() => { setIsForm(false); setEdit(null); }} title=${edit ? "Tahrirlash: " + edit.id : "Yangi vazifa"}>
                <${TaskForm} task=${edit} onSubmit=${(d) => { if(edit) updateTask(d); else addTask(d); setIsForm(false); setEdit(null); }} onCancel=${() => { setIsForm(false); setEdit(null); }} />
            <//>
        </div>
    `;
};

export const TrashPage = () => {
    const { deletedTasks = [], restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in">
            <header class="flex justify-between items-center">
                <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Savat</h2>
                <button onClick=${clearTrash} class="text-red-500 font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 px-4 md:px-6 py-2 md:py-3 rounded-2xl transition-all active:scale-95">Tozalash</button>
            </header>
            <div class="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                ${(deletedTasks || []).length === 0 ? html`
                    <div class="py-20 md:py-40 flex flex-col items-center justify-center opacity-20 grayscale">
                        <${Lucide.Recycle} size="60" strokeWidth="1" class="mb-6" />
                        <p class="font-bold italic uppercase tracking-widest text-xs">Savat bo'sh</p>
                    </div>
                ` : html`
                    <div class="divide-y divide-slate-50">
                        ${deletedTasks.map(t => html`
                            <div key=${t.id} class="p-6 md:p-8 px-6 md:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-all group">
                                <div class="flex items-center gap-4 md:gap-6">
                                    <div class="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-red-400 transition-all shrink-0">
                                        <${Lucide.FileX} size="20" />
                                    </div>
                                    <div>
                                        <p class="font-bold text-slate-800 text-base md:text-lg group-hover:text-red-600 transition-colors line-clamp-1">${t.vazifa}</p>
                                        <p class="text-[10px] md:text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">${t.status} • ID: ${t.id}</p>
                                    </div>
                                </div>
                                <button onClick=${() => restoreTask(t.id)} class="w-full md:w-auto bg-brand-50 text-brand-700 px-6 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] hover:bg-brand-900 hover:text-white transition-all shadow-sm active:scale-95">Tiklash</button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};
