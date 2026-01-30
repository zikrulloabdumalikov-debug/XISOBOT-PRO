
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
    const { tasks = [] } = useContext(TaskContext);
    const [range, setRange] = useState({ ...getWeekRange(new Date()), preset: 'shuHafta' });
    const dashboardRef = useRef(null);

    const filtered = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        return tasks.filter(t => {
            if (!t || !t.sana) return false;
            try {
                const taskDate = typeof t.sana === 'string' ? parseISO(t.sana) : t.sana;
                return isWithinInterval(taskDate, { start: range.start, end: range.end });
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
        if (!dashboardRef.current) return;
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc' });
        if (type === 'png') {
            const l = document.createElement('a'); l.download = `xisobot_${range.preset}.png`; l.href = canvas.toDataURL(); l.click();
        } else {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
            pdf.save(`hisobot_${range.preset}.pdf`);
        }
    };

    const Presets = [
        {id:'bugun', l:'Bugun'}, {id:'kecha', l:'Kecha'}, {id:'shuHafta', l:'Shu hafta'}, {id:'otganHafta', l:"O'tgan hafta"},
        {id:'shuOy', l:'Shu oy'}, {id:'otganOy', l:"O'tgan oy"}, {id:'1chorak', l:'1-ch'}, {id:'2chorak', l:'2-ch'},
        {id:'3chorak', l:'3-ch'}, {id:'4chorak', l:'4-ch'}, {id:'shuYil', l:'Yil'}
    ];

    return html`
        <div class="space-y-8 animate-in fade-in duration-500 font-['Inter']">
            <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p class="text-[10px] font-bold text-teal-600 uppercase tracking-[0.3em] mb-1">Haftalik Hisobot</p>
                    <h2 class="text-2xl font-black text-slate-800">Nazorat Paneli</h2>
                </div>
                <div class="flex gap-2">
                    <button onClick=${() => exportFile('png')} class="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm text-teal-600 hover:bg-teal-50 transition-all" title="PNG rasm"><${Lucide.Image} size="18" /><//>
                    <button onClick=${() => exportFile('pdf')} class="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm text-red-600 hover:bg-red-50 transition-all" title="PDF fayl"><${Lucide.FileText} size="18" /><//>
                </div>
            </header>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-green-600" bg="bg-green-50" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Clock" color="text-amber-600" bg="bg-amber-50" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Circle" color="text-blue-600" bg="bg-blue-50" />
                <${KPICard} label="Jami" count=${stats.total} icon="Layers" color="text-teal-600" bg="bg-teal-50" />
            </div>

            <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1 overflow-x-auto custom-scrollbar">
                ${Presets.map(p => html`
                    <button onClick=${() => setRange({...getPresetRange(p.id), preset: p.id})} 
                            class="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${range.preset === p.id ? 'bg-teal-700 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}">
                        ${p.l}
                    </button>
                `)}
            </div>

            <div ref=${dashboardRef} class="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div key=${s} class="bg-slate-100/50 p-6 rounded-[2rem] border border-slate-200 min-h-[500px]">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="font-bold text-slate-400 uppercase text-[10px] tracking-widest">${s}</h3>
                            <span class="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 text-[10px] font-bold shadow-sm">${filtered.filter(t => t.status === s).length}</span>
                        </div>
                        <div class="space-y-4">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div key=${t.id} class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-all">
                                    <div class="flex justify-between items-start mb-3">
                                        <span class="text-[9px] font-bold px-2 py-1 rounded-md bg-slate-50 text-slate-400 uppercase tracking-tighter border border-slate-100">${t.prioritet || 'Oddiy'}</span>
                                        ${checkOverdue(t.dedlayn, t.status) && html`<span class="text-red-500"><${Lucide.AlertCircle} size="14" /><//>`}
                                    </div>
                                    <h4 class="font-bold text-slate-800 text-sm leading-tight mb-2 line-clamp-2">${t.vazifa}</h4>
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Progress</span> <span>${t.progress || 0}%</span></div>
                                        <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div class="bg-teal-600 h-full rounded-full transition-all duration-700" style="width: ${t.progress || 0}%"></div>
                                        </div>
                                    </div>
                                    <div class="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                                        <span class="flex items-center"><${Lucide.Calendar} size="10" class="mr-1.5" /> ${t.sana}</span>
                                        <span class="font-mono opacity-50">#${t.id}</span>
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
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'id', dir: 'desc' });

    const filtered = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        let res = tasks.filter(t => (t.vazifa || '').toLowerCase().includes(search.toLowerCase()) || (t.id || '').includes(search));
        return res.sort((a, b) => {
            const vA = a[sort.key] || '', vB = b[sort.key] || '';
            return sort.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
        });
    }, [tasks, search, sort]);

    const exportToExcel = () => {
        const data = filtered.map(t => ({
            'ID': t.id,
            'Sana': t.sana,
            'Vazifa': t.vazifa,
            'Status': t.status,
            'Prioritet': t.prioritet,
            'Progress': t.progress + '%'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vazifalar");
        XLSX.writeFile(wb, "vazifalar_hisoboti.xlsx");
    };

    return html`
        <div class="space-y-6 animate-in fade-in duration-500 font-['Inter']">
            <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 class="text-2xl font-black text-slate-800">Vazifalar Ro'yxati</h2>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button onClick=${exportToExcel} class="flex-1 sm:flex-none bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm font-bold text-xs flex items-center justify-center hover:bg-slate-50 transition-all">
                        <${Lucide.Download} size="16" class="mr-2 text-teal-600" /> EXCEL
                    </button>
                    <button onClick=${() => { setEdit(null); setIsForm(true); }} class="flex-1 sm:flex-none bg-teal-700 text-white px-5 py-2.5 rounded-xl shadow-md font-bold text-xs flex items-center justify-center hover:bg-teal-800 transition-all active:scale-95">
                        <${Lucide.Plus} size="16" class="mr-2" /> YANGI QO'SHISH
                    </button>
                </div>
            </header>

            <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center px-5 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all">
                <${Lucide.Search} size="20" class="text-slate-400 mr-4 shrink-0" />
                <input placeholder="Qidiruv..." value=${search} onChange=${e => setSearch(e.target.value)} class="w-full py-2 text-sm bg-transparent outline-none font-medium placeholder:text-slate-300" />
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <tr>
                                <th class="px-6 py-4 cursor-pointer hover:text-teal-700" onClick=${() => setSort({key:'id', dir:sort.dir==='asc'?'desc':'asc'})}>ID</th>
                                <th class="px-6 py-4">Vazifa</th>
                                <th class="px-6 py-4">Status</th>
                                <th class="px-6 py-4">Sana</th>
                                <th class="px-6 py-4 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${filtered.map(t => html`
                                <tr key=${t.id} class="hover:bg-slate-50/30 transition group">
                                    <td class="px-6 py-4 font-mono text-xs text-slate-300">#${t.id}</td>
                                    <td class="px-6 py-4">
                                        <p class="font-bold text-slate-800 text-sm mb-0.5 line-clamp-1">${t.vazifa}</p>
                                        <p class="text-[11px] text-slate-400 font-medium truncate max-w-xs">${t.tavsif || '-'}</p>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${t.status === 'Bajarildi' ? 'bg-green-50 text-green-700' : t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}">
                                            ${t.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-slate-500 font-bold text-xs">${t.sana}</td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick=${() => { setEdit(t); setIsForm(true); }} class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><${Lucide.Edit3} size="16" /><//>
                                            <button onClick=${() => deleteTask(t.id)} class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><${Lucide.Trash2} size="16" /><//>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            </div>

            <${Modal} isOpen=${isForm} onClose=${() => { setIsForm(false); setEdit(null); }} title=${edit ? "Tahrirlash" : "Yangi vazifa"}>
                <${TaskForm} task=${edit} onSubmit=${(d) => { if(edit) updateTask(d); else addTask(d); setIsForm(false); setEdit(null); }} onCancel=${() => { setIsForm(false); setEdit(null); }} />
            <//>
        </div>
    `;
};
