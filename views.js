
import React, { useState, useContext, useMemo } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';
import { TaskContext } from './store.js';
import { KPICard, Modal, TaskForm } from './ui.js';
import { getPresetRange } from './utils.js';

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
        <div class="space-y-8">
            <header class="flex justify-between items-end">
                <div>
                    <p class="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-1">PRO Panel</p>
                    <h2 class="text-3xl font-black text-slate-800 tracking-tight">Monitoring</h2>
                </div>
                <div class="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                    ${['bugun', 'hafta', 'oy', 'jami'].map(p => html`
                        <button key=${p} onClick=${() => setPreset(p)} 
                                class="px-5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${preset === p ? 'bg-teal-700 text-white shadow-xl shadow-teal-700/20' : 'text-slate-400 hover:bg-slate-50'}">
                            ${p}
                        </button>
                    `)}
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-green-600" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Clock" color="text-amber-600" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Circle" color="text-blue-600" />
                <${KPICard} label="Jami" count=${stats.total} icon="Layers" color="text-teal-600" />
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div key=${s} class="bg-slate-200/40 p-6 rounded-[2.5rem] border border-slate-200/50 min-h-[500px] flex flex-col">
                        <div class="flex items-center justify-between mb-6 px-2">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${s}</h3>
                            <span class="bg-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">${filtered.filter(t => t.status === s).length}</span>
                        </div>
                        <div class="space-y-4 flex-1">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div key=${t.id} class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all group">
                                    <h4 class="font-bold text-slate-800 text-sm mb-3 line-clamp-2">${t.vazifa}</h4>
                                    <div class="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
                                        <span class="flex items-center"><${Lucide.Calendar} size="10" class="mr-1.5" /> ${t.sana}</span>
                                        <span class="text-teal-600">${t.progress}%</span>
                                    </div>
                                </div>
                            `)}
                            ${filtered.filter(t => t.status === s).length === 0 && html`
                                <div class="flex-1 flex flex-col items-center justify-center opacity-10 py-20 italic">
                                    <${Lucide.Inbox} size="40" class="mb-2" />
                                    <span class="text-xs font-black">Bo'sh</span>
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

    return html`
        <div class="space-y-6">
            <header class="flex justify-between items-center">
                <h2 class="text-2xl font-black text-slate-800">Vazifalar Ro'yxati</h2>
                <button onClick=${() => { setEdit(null); setIsForm(true); }} class="bg-teal-700 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center hover:bg-teal-800 transition-all shadow-xl shadow-teal-700/20 active:scale-95">
                    <${Lucide.Plus} size="18" class="mr-2" /> Yangi qo'shish
                </button>
            </header>

            <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead class="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                            <tr>
                                <th class="px-8 py-5">Vazifa nomi</th>
                                <th class="px-8 py-5">Status</th>
                                <th class="px-8 py-5">Sana</th>
                                <th class="px-8 py-5 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${(tasks || []).map(t => html`
                                <tr key=${t.id} class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-8 py-5">
                                        <p class="font-bold text-slate-800 text-sm mb-0.5">${t.vazifa}</p>
                                        <p class="text-[11px] text-slate-400 font-medium truncate max-w-xs">${t.tavsif || 'Tavsif yo\'q'}</p>
                                    </td>
                                    <td class="px-8 py-5">
                                        <span class="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600">${t.status}</span>
                                    </td>
                                    <td class="px-8 py-5 text-slate-500 font-bold text-xs">${t.sana}</td>
                                    <td class="px-8 py-5 text-right">
                                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick=${() => { setEdit(t); setIsForm(true); }} class="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><${Lucide.Edit3} size="16" /><//>
                                            <button onClick=${() => deleteTask(t.id)} class="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"><${Lucide.Trash2} size="16" /><//>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
                ${(tasks || []).length === 0 && html`<div class="py-20 text-center text-slate-300 font-bold italic">Vazifalar topilmadi</div>`}
            </div>

            <${Modal} isOpen=${isForm} onClose=${() => { setIsForm(false); setEdit(null); }} title=${edit ? "Tahrirlash" : "Yangi vazifa"}>
                <${TaskForm} task=${edit} onSubmit=${(d) => { if(edit) updateTask(d); else addTask(d); setIsForm(false); setEdit(null); }} onCancel=${() => { setIsForm(false); setEdit(null); }} />
            <//>
        </div>
    `;
};

export const TrashPage = () => {
    const { deletedTasks = [], restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-6">
            <header class="flex justify-between items-center">
                <h2 class="text-2xl font-black text-slate-800">Savat</h2>
                <button onClick=${clearTrash} class="text-red-500 font-black text-[10px] uppercase tracking-widest hover:underline px-4 py-2 transition-all">Savatni tozalash</button>
            </header>
            <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                ${(deletedTasks || []).length === 0 ? html`
                    <div class="py-32 flex flex-col items-center justify-center text-slate-300">
                        <${Lucide.Trash2} size="64" class="opacity-10 mb-4" />
                        <p class="font-bold italic">Savat bo'sh</p>
                    </div>
                ` : html`
                    <div class="divide-y divide-slate-50">
                        ${deletedTasks.map(t => html`
                            <div key=${t.id} class="p-6 px-8 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div>
                                    <p class="font-bold text-slate-800">${t.vazifa}</p>
                                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">${t.status} • ${t.sana}</p>
                                </div>
                                <button onClick=${() => restoreTask(t.id)} class="bg-teal-50 text-teal-700 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-teal-100 transition-colors">Tiklash</button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};
