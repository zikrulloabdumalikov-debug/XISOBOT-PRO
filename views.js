
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
    const { tasks } = useContext(TaskContext);
    const [range, setRange] = useState({ ...getWeekRange(new Date()), preset: 'shuHafta' });
    const dashboardRef = useRef(null);

    // CRITICAL FIX: t.sana property-si tekshiriladi
    const filtered = useMemo(() => {
        return tasks.filter(t => {
            if (!t.sana) return false;
            try {
                return isWithinInterval(parseISO(t.sana), { start: range.start, end: range.end });
            } catch (e) {
                return false;
            }
        });
    }, [tasks, range]);
    
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

    const Presets = [
        {id:'bugun', l:'Bugun'}, {id:'kecha', l:'Kecha'}, {id:'shuHafta', l:'Shu hafta'}, {id:'otganHafta', l:"O'tgan hafta"},
        {id:'shuOy', l:'Shu oy'}, {id:'otganOy', l:"O'tgan oy"}, {id:'1chorak', l:'1-chorak'}, {id:'2chorak', l:'2-chorak'},
        {id:'3chorak', l:'3-chorak'}, {id:'4chorak', l:'4-chorak'}, {id:'1yarimYillik', l:'1-yarim yillik'}, {id:'shuYil', l:'Shu yil'}
    ];

    return html`
        <div class="space-y-10 animate-in fade-in duration-700">
            <header class="flex justify-between items-end">
                <div>
                    <p class="text-[11px] font-black text-teal-600 uppercase tracking-[0.5em] mb-3">HISOBOT MONITORING tizimi</p>
                    <h2 class="text-4xl font-black text-slate-800 tracking-tight">Nazorat Paneli</h2>
                </div>
                <div class="flex gap-4">
                    <button onClick=${() => exportFile('png')} class="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm text-teal-600 hover:bg-teal-50 hover:shadow-lg transition-all" title="PNG rasm"><${Lucide.Image} size="24" /><//>
                    <button onClick=${() => exportFile('pdf')} class="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm text-red-600 hover:bg-red-50 hover:shadow-lg transition-all" title="PDF fayl"><${Lucide.FileText} size="24" /><//>
                </div>
            </header>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-green-600" bg="bg-green-50" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Clock" color="text-amber-600" bg="bg-amber-50" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Circle" color="text-blue-600" bg="bg-blue-50" />
                <${KPICard} label="Jami" count=${stats.total} icon="Layers" color="text-teal-600" bg="bg-teal-50" />
            </div>

            <div class="bg-white p-3 rounded-[3rem] border border-slate-200 shadow-sm flex flex-wrap gap-2 overflow-x-auto custom-scrollbar">
                ${Presets.map(p => html`
                    <button onClick=${() => setRange({...getPresetRange(p.id), preset: p.id})} 
                            class="px-7 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${range.preset === p.id ? 'bg-teal-700 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-50'}">
                        ${p.l}
                    </button>
                `)}
            </div>

            <div ref=${dashboardRef} class="grid grid-cols-1 md:grid-cols-3 gap-10 p-1">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div class="bg-slate-100/40 p-8 rounded-[3.5rem] border-2 border-dashed border-slate-200 min-h-[700px]">
                        <h3 class="font-black text-slate-400 uppercase text-[12px] tracking-[0.4em] mb-10 flex justify-between items-center px-3">
                            ${s} <span class="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-slate-800 text-[11px] shadow-sm">${filtered.filter(t => t.status === s).length}</span>
                        </h3>
                        <div class="space-y-6">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div class="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-200 group hover:shadow-2xl transition-all duration-500">
                                    <div class="flex justify-between items-start mb-5">
                                        <span class="text-[9px] font-black px-3 py-2 rounded-xl bg-slate-50 text-slate-400 uppercase tracking-widest border border-slate-100">${t.prioritet}</span>
                                        ${checkOverdue(t.dedlayn, t.status) && html`<span class="text-red-500 animate-bounce bg-red-50 p-2 rounded-full"><${Lucide.AlertTriangle} size="18" /><//>`}
                                    </div>
                                    <h4 class="font-bold text-slate-800 text-[16px] leading-tight group-hover:text-teal-700 transition-colors">${t.vazifa}</h4>
                                    <p class="text-xs text-slate-400 mt-3 line-clamp-2 font-medium opacity-80">${t.tavsif || 'Tavsif yo\'q'}</p>
                                    <div class="mt-6 space-y-3">
                                        <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>Progress</span> <span>${t.progress}%</span></div>
                                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                            <div class="bg-teal-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(13,148,136,0.3)]" style="width: ${t.progress}%"></div>
                                        </div>
                                    </div>
                                    <div class="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                        <span class="flex items-center"><${Lucide.Calendar} size="14" class="mr-2 opacity-50" /> ${t.sana}</span>
                                        <span class="font-mono text-slate-200">#${t.id}</span>
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
        let res = tasks.filter(t => (t.vazifa || '').toLowerCase().includes(search.toLowerCase()) || (t.id || '').includes(search));
        return res.sort((a, b) => {
            const vA = a[sort.key] || '', vB = b[sort.key] || '';
            return sort.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
        });
    }, [tasks, search, sort]);

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(tasks);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vazifalar");
        XLSX.writeFile(wb, "xisobot_pro_full.xlsx");
    };

    return html`
        <div class="space-y-10 animate-in fade-in duration-500">
            <header class="flex justify-between items-center">
                <h2 class="text-4xl font-black text-slate-800 tracking-tight">Vazifalar Ombori</h2>
                <div class="flex gap-4">
                    <button onClick=${exportToExcel} class="bg-white border border-slate-200 px-8 py-5 rounded-[2rem] shadow-sm font-black text-[11px] uppercase tracking-[0.2em] flex items-center hover:bg-slate-50 transition-all active:scale-95">
                        <${Lucide.Download} size="20" class="mr-3 text-teal-600" /> EXCEL EKSPORT
                    </button>
                    <button onClick=${() => setIsForm(true)} class="bg-teal-700 text-white px-9 py-5 rounded-[2rem] shadow-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center hover:bg-teal-800 transition-all hover:scale-105 active:scale-95">
                        <${Lucide.Plus} size="20" class="mr-3" /> YANGI QO'SHISH
                    </button>
                </div>
            </header>

            <div class="bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center px-8 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
                <${Lucide.Search} size="24" class="text-slate-400 mr-6" />
                <input placeholder="ID yoki vazifa nomi bo'yicha qidiruv..." value=${search} onChange=${e => setSearch(e.target.value)} class="w-full py-5 text-lg bg-transparent outline-none font-medium placeholder:text-slate-300" />
            </div>

            <div class="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <tr>
                                <th class="px-10 py-7 cursor-pointer hover:text-teal-700" onClick=${() => setSort({key:'id', dir:sort.dir==='asc'?'desc':'asc'})}>ID</th>
                                <th class="px-10 py-7">Vazifa Ma'lumoti</th>
                                <th class="px-10 py-7 cursor-pointer hover:text-teal-700" onClick=${() => setSort({key:'sana', dir:sort.dir==='asc'?'desc':'asc'})}>Sana</th>
                                <th class="px-10 py-7">Status</th>
                                <th class="px-10 py-7">Progress</th>
                                <th class="px-10 py-7 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${filtered.map(t => html`
                                <tr key=${t.id} class="hover:bg-slate-50/50 transition group">
                                    <td class="px-10 py-7 font-mono text-[12px] text-slate-300">#${t.id}</td>
                                    <td class="px-10 py-7">
                                        <p class="font-bold text-slate-800 text-[16px] group-hover:text-teal-700 transition-colors">${t.vazifa}</p>
                                        <p class="text-[12px] text-slate-400 font-medium italic mt-1 truncate max-w-sm">${t.tavsif || 'Tavsif yo\'q'}</p>
                                    </td>
                                    <td class="px-10 py-7 text-slate-500 font-black text-[11px] uppercase">${t.sana}</td>
                                    <td class="px-10 py-7">
                                        <span class="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${t.status === 'Bajarildi' ? 'bg-green-50 text-green-700 border-green-100' : t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}">
                                            ${t.status}
                                        </span>
                                    </td>
                                    <td class="px-10 py-7">
                                        <div class="flex flex-col gap-2">
                                            <div class="w-32 bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner"><div class="bg-teal-600 h-full rounded-full transition-all duration-500" style="width:${t.progress}%"></div></div>
                                            <span class="text-[11px] font-black text-teal-700/60 tracking-tighter">${t.progress}%</span>
                                        </div>
                                    </td>
                                    <td class="px-10 py-7 text-right">
                                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <button onClick=${() => setEdit(t)} class="p-3.5 text-blue-500 hover:bg-blue-50 rounded-2xl shadow-sm border border-transparent hover:border-blue-100 transition-all"><${Lucide.Edit3} size="20" /><//>
                                            <button onClick=${() => deleteTask(t.id)} class="p-3.5 text-red-500 hover:bg-red-50 rounded-2xl shadow-sm border border-transparent hover:border-red-100 transition-all"><${Lucide.Trash2} size="20" /><//>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            </div>

            <${Modal} isOpen=${isForm || !!edit} onClose=${() => { setIsForm(false); setEdit(null); }} title=${edit ? "Ma'lumotlarni Tahrirlash" : "Yangi Ma'lumot Qo'shish"}>
                <${TaskForm} task=${edit} onSubmit=${(d) => { if(edit) updateTask(d); else addTask(d); setIsForm(false); setEdit(null); }} onCancel=${() => { setIsForm(false); setEdit(null); }} />
            <//>
        </div>
    `;
};

export const TrashPage = () => {
    const { deletedTasks, restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-10 animate-in fade-in duration-500">
            <header class="flex justify-between items-center">
                <h2 class="text-4xl font-black text-slate-800 tracking-tight">Savat</h2>
                <button onClick=${clearTrash} class="bg-red-50 text-red-600 px-9 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.25em] hover:bg-red-100 transition-all hover:scale-105 active:scale-95 shadow-sm">SAVATNI TOZALASH</button>
            </header>
            <div class="bg-white rounded-[3rem] border border-slate-200 shadow-sm min-h-[500px]">
                ${deletedTasks.length === 0 ? html`<div class="py-52 text-center flex flex-col items-center"><${Lucide.Trash} size="80" class="text-slate-100 mb-8" /><p class="text-slate-300 italic font-black uppercase tracking-[0.3em] text-sm">Savat hozircha bo'sh</p></div>` : deletedTasks.map(t => html`
                    <div key=${t.id} class="p-10 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50/50 transition-all group">
                        <div>
                            <p class="font-bold text-slate-800 text-xl group-hover:text-teal-700 transition-colors">${t.vazifa}</p>
                            <div class="flex items-center gap-4 mt-2">
                                <span class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">ID: #${t.id}</span>
                                <span class="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                <span class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">SANA: ${t.sana}</span>
                            </div>
                        </div>
                        <button onClick=${() => restoreTask(t.id)} class="bg-teal-50 text-teal-700 px-9 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all hover:scale-110 active:scale-95 shadow-sm">TIKLASH</button>
                    </div>
                `)}
            </div>
        </div>
    `;
};
