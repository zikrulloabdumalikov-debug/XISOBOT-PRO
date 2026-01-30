
import React, { useState, useContext, useRef, useMemo } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TaskContext } from './store.js';
import { KPICard, Modal, TaskForm } from './ui.js';
import { getPresetRange, getWeekRange, checkOverdue } from './utils.js';

const html = htm.bind(React.createElement);

export const Dashboard = () => {
    const { tasks, updateTask } = useContext(TaskContext);
    const [range, setRange] = useState({ ...getWeekRange(new Date()), preset: 'thisWeek' });
    const dashboardRef = useRef(null);

    const filtered = tasks.filter(t => isWithinInterval(parseISO(t.date), { start: range.start, end: range.end }));
    
    const stats = {
        done: filtered.filter(t => t.status === 'Bajarildi').length,
        doing: filtered.filter(t => t.status === 'Jarayonda').length,
        todo: filtered.filter(t => t.status === 'Rejada').length,
        total: filtered.length
    };

    const exportFile = async (type) => {
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc' });
        if (type === 'png') {
            const l = document.createElement('a'); l.download = `xisobot_${range.preset}.png`; l.href = canvas.toDataURL(); l.click();
        } else {
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
            pdf.save(`hisobot_${range.preset}.pdf`);
        }
    };

    const Presets = ['today', 'yesterday', 'thisWeek', 'prevWeek', 'thisMonth', 'q1', 'q2', 'q3', 'q4', 'half1', 'half2', 'thisYear'];

    return html`
        <div class="space-y-8 animate-in fade-in duration-500">
            <header class="flex justify-between items-end">
                <div>
                    <p class="text-[10px] font-black text-teal-600 uppercase tracking-[0.4em] mb-2">HISOBOT PRO 4.0</p>
                    <h2 class="text-3xl font-black text-slate-800 tracking-tight">Monitoring Paneli</h2>
                </div>
                <div class="flex gap-3">
                    <button onClick=${() => exportFile('png')} class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm text-teal-600 hover:bg-teal-50 transition-all hover:scale-105" title="PNG rasm"><${Lucide.Image} size="22" /><//>
                    <button onClick=${() => exportFile('pdf')} class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm text-red-600 hover:bg-red-50 transition-all hover:scale-105" title="PDF fayl"><${Lucide.FileText} size="22" /><//>
                </div>
            </header>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-green-600" bg="bg-green-50" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Clock" color="text-amber-600" bg="bg-amber-50" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Circle" color="text-blue-600" bg="bg-blue-50" />
                <${KPICard} label="Jami" count=${stats.total} icon="Layers" color="text-teal-600" bg="bg-teal-50" />
            </div>

            <div class="bg-white p-2.5 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-wrap gap-1.5 overflow-x-auto custom-scrollbar">
                ${Presets.map(p => html`
                    <button onClick=${() => setRange({...getPresetRange(p), preset: p})} 
                            class="px-6 py-3.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${range.preset === p ? 'bg-teal-700 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}">
                        ${p}
                    </button>
                `)}
            </div>

            <div ref=${dashboardRef} class="grid grid-cols-1 md:grid-cols-3 gap-8 p-1">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div class="bg-slate-100/40 p-7 rounded-[2.5rem] border-2 border-dashed border-slate-200 min-h-[600px]">
                        <h3 class="font-black text-slate-400 uppercase text-[11px] tracking-[0.3em] mb-8 flex justify-between items-center px-2">
                            ${s} <span class="bg-white px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-800 text-[10px] shadow-sm">${filtered.filter(t => t.status === s).length}</span>
                        </h3>
                        <div class="space-y-5">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 group hover:shadow-2xl transition-all duration-500 cursor-default">
                                    <div class="flex justify-between items-start mb-4">
                                        <span class="text-[9px] font-black px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-400 uppercase tracking-tighter border border-slate-100">${t.prioritet}</span>
                                        ${checkOverdue(t.dedlayn, t.status) && html`<span class="text-red-500 animate-bounce"><${Lucide.AlertTriangle} size="16" /><//>`}
                                    </div>
                                    <h4 class="font-bold text-slate-800 text-[15px] leading-snug group-hover:text-teal-700 transition-colors">${t.vazifa}</h4>
                                    <p class="text-xs text-slate-400 mt-2 line-clamp-2 font-medium opacity-80">${t.tavsif}</p>
                                    <div class="mt-5 space-y-2.5">
                                        <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>Progress</span> <span>${t.progress}%</span></div>
                                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                                            <div class="bg-teal-600 h-full rounded-full transition-all duration-1000" style="width: ${t.progress}%"></div>
                                        </div>
                                    </div>
                                    <div class="mt-5 pt-5 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 font-black uppercase">
                                        <span class="flex items-center"><${Lucide.Calendar} size="12" class="mr-1.5 opacity-60" /> ${t.date}</span>
                                        <span class="font-mono text-slate-300">#${t.id}</span>
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
    const { tasks, addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [edit, setEdit] = useState(null);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'id', dir: 'desc' });

    const filtered = useMemo(() => {
        let res = tasks.filter(t => t.vazifa.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search));
        return res.sort((a, b) => {
            const vA = a[sort.key], vB = b[sort.key];
            return sort.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
        });
    }, [tasks, search, sort]);

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(tasks);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "xisobot_pro_full_export.xlsx");
    };

    return html`
        <div class="space-y-8 animate-in fade-in duration-500">
            <header class="flex justify-between items-center">
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Barcha Vazifalar</h2>
                <div class="flex gap-3">
                    <button onClick=${exportToExcel} class="bg-white border border-slate-200 px-6 py-4 rounded-2xl shadow-sm font-black text-[11px] uppercase tracking-widest flex items-center hover:bg-slate-50 transition-colors">
                        <${Lucide.Download} size="18" class="mr-2.5 text-teal-600" /> EXCELGA EKSPORT
                    </button>
                    <button onClick=${() => setIsForm(true)} class="bg-teal-700 text-white px-7 py-4 rounded-2xl shadow-xl font-black text-[11px] uppercase tracking-widest flex items-center hover:bg-teal-800 transition-all hover:scale-105 active:scale-95">
                        <${Lucide.Plus} size="18" class="mr-2.5" /> YANGI QO'SHISH
                    </button>
                </div>
            </header>

            <div class="bg-white p-3 rounded-3xl border border-slate-200 shadow-sm flex items-center px-6 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                <${Lucide.Search} size="20" class="text-slate-400 mr-5" />
                <input placeholder="Qidiruv (ID yoki vazifa nomi)..." value=${search} onChange=${e => setSearch(e.target.value)} class="w-full py-4 text-[15px] bg-transparent outline-none font-medium placeholder:text-slate-300" />
            </div>

            <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            <tr>
                                <th class="px-8 py-6 cursor-pointer hover:text-teal-700" onClick=${() => setSort({key:'id', dir:sort.dir==='asc'?'desc':'asc'})}>ID</th>
                                <th class="px-8 py-6">Vazifa Ma'lumoti</th>
                                <th class="px-8 py-6 cursor-pointer hover:text-teal-700" onClick=${() => setSort({key:'date', dir:sort.dir==='asc'?'desc':'asc'})}>Sana</th>
                                <th class="px-8 py-6">Status</th>
                                <th class="px-8 py-6">Progress</th>
                                <th class="px-8 py-6 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${filtered.map(t => html`
                                <tr key=${t.id} class="hover:bg-slate-50/50 transition group">
                                    <td class="px-8 py-6 font-mono text-[11px] text-slate-400 tracking-tighter">#${t.id}</td>
                                    <td class="px-8 py-6">
                                        <p class="font-bold text-slate-800 text-[15px] group-hover:text-teal-700 transition-colors">${t.vazifa}</p>
                                        <p class="text-[11px] text-slate-400 font-medium italic mt-0.5 truncate max-w-xs">${t.tavsif}</p>
                                    </td>
                                    <td class="px-8 py-6 text-slate-500 font-black text-[11px]">${t.date}</td>
                                    <td class="px-8 py-6">
                                        <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm border ${t.status === 'Bajarildi' ? 'bg-green-50 text-green-700 border-green-100' : t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}">
                                            ${t.status}
                                        </span>
                                    </td>
                                    <td class="px-8 py-6">
                                        <div class="flex flex-col gap-1.5">
                                            <div class="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner"><div class="bg-teal-600 h-full rounded-full transition-all duration-500" style="width:${t.progress}%"></div></div>
                                            <span class="text-[10px] font-black text-teal-700/60">${t.progress}%</span>
                                        </div>
                                    </td>
                                    <td class="px-8 py-6 text-right">
                                        <div class="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                            <button onClick=${() => setEdit(t)} class="p-3 text-blue-500 hover:bg-blue-50 rounded-2xl shadow-sm border border-transparent hover:border-blue-100 transition-all"><${Lucide.Edit3} size="18" /><//>
                                            <button onClick=${() => deleteTask(t.id)} class="p-3 text-red-500 hover:bg-red-50 rounded-2xl shadow-sm border border-transparent hover:border-red-100 transition-all"><${Lucide.Trash2} size="18" /><//>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            </div>

            <${Modal} isOpen=${isForm || !!edit} onClose=${() => { setIsForm(false); setEdit(null); }} title=${edit ? "Vazifani Tahrirlash" : "Yangi Vazifa Qo'shish"}>
                <${TaskForm} task=${edit} onSubmit=${(d) => { edit ? updateTask(d) : addTask(d); setIsForm(false); setEdit(null); }} onCancel=${() => { setIsForm(false); setEdit(null); }} />
            <//>
        </div>
    `;
};

export const TrashPage = () => {
    const { deletedTasks, restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-8 animate-in fade-in duration-500">
            <header class="flex justify-between items-center">
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Savat</h2>
                <button onClick=${clearTrash} class="bg-red-50 text-red-600 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-red-100 transition-all hover:scale-105 active:scale-95 shadow-sm">SAVATNI BUTUNLAY TOZALASH</button>
            </header>
            <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[400px]">
                ${deletedTasks.length === 0 ? html`<div class="py-40 text-center flex flex-col items-center"><${Lucide.Trash} size="64" class="text-slate-100 mb-6" /><p class="text-slate-300 italic font-black uppercase tracking-widest text-xs">Savat hozircha bo'sh</p></div>` : deletedTasks.map(t => html`
                    <div key=${t.id} class="p-8 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50/50 transition-colors group">
                        <div>
                            <p class="font-bold text-slate-800 text-lg group-hover:text-teal-700 transition-colors">${t.vazifa}</p>
                            <div class="flex items-center gap-3 mt-1.5">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: #${t.id}</span>
                                <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">O'CHIRILGAN SANA: ${t.date}</span>
                            </div>
                        </div>
                        <button onClick=${() => restoreTask(t.id)} class="bg-teal-50 text-teal-700 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all hover:scale-105 active:scale-95 shadow-sm">TIKLASH</button>
                    </div>
                `)}
            </div>
        </div>
    `;
};
