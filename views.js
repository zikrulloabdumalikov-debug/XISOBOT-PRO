
import React, { useState, useContext, useMemo } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';
import { TaskContext } from './store.js';
import { KPICard, Modal, TaskForm } from './ui.js';
import { getPresetRange, exportToExcel, getTaskMeta } from './utils.js';

const html = htm.bind(React.createElement);

export const Dashboard = () => {
    const { tasks = [] } = useContext(TaskContext);
    const [preset, setPreset] = useState('hafta');
    
    const range = useMemo(() => getPresetRange(preset), [preset]);
    const filtered = useMemo(() => {
        return (tasks || []).filter(t => {
            if (!t?.sana) return false;
            try { return isWithinInterval(parseISO(t.sana), { start: range.start, end: range.end }); }
            catch (e) { return false; }
        });
    }, [tasks, range]);

    const stats = {
        done: filtered.filter(t => t.status === 'Bajarildi').length,
        doing: filtered.filter(t => t.status === 'Jarayonda').length,
        todo: filtered.filter(t => t.status === 'Rejada').length,
        total: filtered.length
    };

    return html`
        <div class="space-y-10 animate-fade-in">
            <header class="flex justify-between items-end">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                        <p class="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Tizim Faol</p>
                    </div>
                    <h2 class="text-4xl font-black text-slate-800 tracking-tight">Monitoring</h2>
                </div>
                <div class="flex bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
                    ${['bugun', 'hafta', 'oy', 'jami'].map(p => html`
                        <button key=${p} onClick=${() => setPreset(p)} 
                                class="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${preset === p ? 'bg-brand-900 text-white shadow-xl shadow-brand-900/20' : 'text-slate-400 hover:bg-slate-50'}">
                            ${p}
                        </button>
                    `)}
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-emerald-500" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Activity" color="text-amber-500" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Compass" color="text-indigo-500" />
                <${KPICard} label="Jami" count=${stats.total} icon="BarChart3" color="text-brand-500" />
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div key=${s} class="bg-slate-100/50 p-6 rounded-[2.5rem] border border-slate-200/50 min-h-[500px] flex flex-col">
                        <div class="flex items-center justify-between mb-8 px-2">
                            <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">${s}</h3>
                            <span class="bg-white text-[11px] font-black px-3 py-1 rounded-xl border border-slate-200 shadow-sm">${filtered.filter(t => t.status === s).length}</span>
                        </div>
                        <div class="space-y-5 flex-1">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div key=${t.id} class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
                                    <h4 class="font-bold text-slate-800 text-sm mb-4 leading-relaxed">${t.vazifa}</h4>
                                    <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span class="flex items-center"><${Lucide.Calendar} size="12" class="mr-2 opacity-50" /> ${t.sana}</span>
                                        <div class="flex items-center gap-2">
                                            <div class="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div class="h-full bg-brand-500" style="width: ${t.progress}%"></div>
                                            </div>
                                            <span class="text-brand-500">${t.progress}%</span>
                                        </div>
                                    </div>
                                </div>
                            `)}
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
        let result = tasks.map(t => ({ ...t, ...getTaskMeta(t.sana, t.dedlayn, t.status) }));
        
        // Filter
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                result = result.filter(t => String(t[key] || '').toLowerCase().includes(filters[key]));
            }
        });

        // Sort
        result.sort((a, b) => {
            const valA = a[sort.key];
            const valB = b[sort.key];
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [tasks, sort, filters]);

    const columns = [
        { key: 'id', label: 'ID', width: 'w-24' },
        { key: 'sana', label: 'Sana', width: 'w-32' },
        { key: 'vazifa', label: 'Vazifa', width: 'w-64' },
        { key: 'tavsif', label: 'Tavsif', width: 'w-64' },
        { key: 'status', label: 'Status', width: 'w-32' },
        { key: 'izoh', label: 'Izoh', width: 'w-48' },
        { key: 'isCurrentWeek', label: 'Bu hafta', width: 'w-24' },
        { key: 'weekNum', label: 'Hafta №', width: 'w-24' },
        { key: 'year', label: 'Yil', width: 'w-24' },
        { key: 'prioritet', label: 'Prioritet', width: 'w-32' },
        { key: 'dedlayn', label: 'Dedlayn', width: 'w-32' },
        { key: 'progress', label: 'Progress', width: 'w-24' },
        { key: 'isOverdue', label: 'Proshrocheno?', width: 'w-32' },
        { key: 'isOldWeek', label: 'Eski hafta', width: 'w-32' }
    ];

    return html`
        <div class="space-y-8 animate-fade-in pb-20">
            <header class="flex justify-between items-center">
                <div>
                    <h2 class="text-3xl font-black text-slate-800 tracking-tight">Vazifalar Boshqaruvi</h2>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Haqiqiy vaqt rejimida monitoring</p>
                </div>
                <div class="flex gap-4">
                    <button onClick=${() => exportToExcel(tasks)} class="bg-white text-slate-600 border border-slate-200 px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                        <${Lucide.FileSpreadsheet} size="18" class="mr-2 text-emerald-500" /> Excel Export
                    </button>
                    <button onClick=${() => { setEdit(null); setIsForm(true); }} class="bg-brand-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95">
                        <${Lucide.Plus} size="20" class="mr-2" /> Yangi vazifa
                    </button>
                </div>
            </header>

            <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left text-[11px] border-collapse min-w-[2000px]">
                        <thead class="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                ${columns.map(col => html`
                                    <th key=${col.key} class="${col.width} px-6 py-4">
                                        <div class="flex flex-col gap-3">
                                            <button onClick=${() => handleSort(col.key)} class="flex items-center group text-slate-400 hover:text-brand-500 transition-colors uppercase font-black tracking-widest">
                                                ${col.label}
                                                <${Lucide.ChevronDown} size="14" class="ml-1 opacity-0 group-hover:opacity-100 ${sort.key === col.key && sort.dir === 'desc' ? 'rotate-180 opacity-100 text-brand-500' : ''}" />
                                            </button>
                                            <input type="text" placeholder="Filtr..." 
                                                onChange=${e => handleFilter(col.key, e.target.value)}
                                                class="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all" />
                                        </div>
                                    </th>
                                `)}
                                <th class="w-32 px-6 py-4 text-right uppercase font-black tracking-widest text-slate-400">Amallar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${processedTasks.map(t => html`
                                <tr key=${t.id} class="hover:bg-slate-50/80 transition-all duration-300 group">
                                    <td class="px-6 py-5 font-mono text-slate-400">${t.id}</td>
                                    <td class="px-6 py-5 font-bold text-slate-600">${t.sana}</td>
                                    <td class="px-6 py-5 font-extrabold text-slate-800 text-[13px]">${t.vazifa}</td>
                                    <td class="px-6 py-5 text-slate-400 max-w-[250px] truncate">${t.tavsif || '-'}</td>
                                    <td class="px-6 py-5">
                                        <span class="px-3 py-1 rounded-lg font-black uppercase tracking-tighter text-[9px] ${
                                            t.status === 'Bajarildi' ? 'bg-emerald-50 text-emerald-600' : 
                                            t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                        }">${t.status}</span>
                                    </td>
                                    <td class="px-6 py-5 text-slate-400 italic">${t.izoh || '-'}</td>
                                    <td class="px-6 py-5 font-bold ${t.isCurrentWeek === 'Ha' ? 'text-brand-500' : 'text-slate-300'}">${t.isCurrentWeek}</td>
                                    <td class="px-6 py-5 text-slate-500 font-bold">${t.weekNum}</td>
                                    <td class="px-6 py-5 text-slate-500">${t.year}</td>
                                    <td class="px-6 py-5">
                                        <span class="font-bold ${
                                            t.prioritet === 'Juda muhum' ? 'text-red-500' :
                                            t.prioritet === 'Muhum' ? 'text-amber-500' : 'text-emerald-500'
                                        }">${t.prioritet}</span>
                                    </td>
                                    <td class="px-6 py-5 font-bold text-slate-500">${t.dedlayn || '-'}</td>
                                    <td class="px-6 py-5">
                                        <div class="flex items-center gap-2">
                                            <div class="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div class="h-full bg-brand-500" style="width: ${t.progress}%"></div>
                                            </div>
                                            <span class="font-bold text-brand-500">${t.progress}%</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-5 font-black ${t.isOverdue === 'Ha' ? 'text-red-600' : 'text-slate-300'}">${t.isOverdue}</td>
                                    <td class="px-6 py-5 text-slate-300">${t.isOldWeek}</td>
                                    <td class="px-6 py-5 text-right">
                                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                            <button onClick=${() => { setEdit(t); setIsForm(true); }} class="p-2 text-brand-500 hover:bg-brand-50 rounded-xl transition-all"><${Lucide.Edit} size="16" /><//>
                                            <button onClick=${() => deleteTask(t.id)} class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><${Lucide.Trash2} size="16" /><//>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
                ${processedTasks.length === 0 && html`
                    <div class="py-40 flex flex-col items-center justify-center grayscale opacity-20 text-center">
                        <${Lucide.SearchX} size="64" strokeWidth="1" class="mb-4" />
                        <p class="font-black uppercase tracking-widest text-xs">Ma'lumot topilmadi</p>
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
        <div class="space-y-8 animate-fade-in">
            <header class="flex justify-between items-center">
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Savat</h2>
                <button onClick=${clearTrash} class="text-red-500 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 px-6 py-3 rounded-2xl transition-all">Savatni tozalash</button>
            </header>
            <div class="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                ${(deletedTasks || []).length === 0 ? html`
                    <div class="py-40 flex flex-col items-center justify-center opacity-20 grayscale">
                        <${Lucide.Recycle} size="80" strokeWidth="1" class="mb-6" />
                        <p class="font-bold italic uppercase tracking-widest text-xs">Savatda o'chirilgan fayllar yo'q</p>
                    </div>
                ` : html`
                    <div class="divide-y divide-slate-50">
                        ${deletedTasks.map(t => html`
                            <div key=${t.id} class="p-8 px-10 flex justify-between items-center hover:bg-slate-50 transition-all group">
                                <div class="flex items-center gap-6">
                                    <div class="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-red-400 transition-all">
                                        <${Lucide.FileX} size="24" />
                                    </div>
                                    <div>
                                        <p class="font-bold text-slate-800 text-lg group-hover:text-red-600 transition-colors">${t.vazifa}</p>
                                        <p class="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1.5">${t.status} • ID: ${t.id}</p>
                                    </div>
                                </div>
                                <button onClick=${() => restoreTask(t.id)} class="bg-brand-50 text-brand-700 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] hover:bg-brand-900 hover:text-white transition-all shadow-sm">Tiklash</button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};
