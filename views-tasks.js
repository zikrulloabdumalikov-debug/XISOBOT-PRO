
import React, { useState, useContext, useMemo } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskContext } from './store.js';
import { Modal, TaskForm } from './ui.js';
import { exportToExcel } from './utils.js';

const html = htm.bind(React.createElement);

export const TasksPage = () => {
    const { tasks = [], addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [modalTask, setModalTask] = useState(null);

    return html`
        <div class="space-y-8 animate-fade-in pb-20">
            <header class="flex justify-between items-center">
                <div><h2 class="text-3xl font-black text-slate-800 tracking-tight">Vazifalar</h2><p class="text-xs text-slate-400 font-bold uppercase mt-1">Jami ${tasks.length} ta yozuv</p></div>
                <div class="flex gap-3">
                    <button onClick=${() => exportToExcel(tasks)} class="bg-white border px-6 py-3 rounded-2xl font-bold text-xs flex items-center shadow-sm"><${Lucide.FileSpreadsheet} size="18" class="mr-2 text-emerald-500" /> Excel</button>
                    <button onClick=${() => { setModalTask(null); setIsForm(true); }} class="bg-brand-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs flex items-center shadow-xl"><${Lucide.Plus} size="20" class="mr-2" /> Yangi</button>
                </div>
            </header>
            <div class="bg-white rounded-[2.5rem] border shadow-xl overflow-x-auto">
                <table class="w-full text-left text-[11px] border-separate border-spacing-0">
                    <thead class="sticky top-0 bg-slate-100 z-10">
                        <tr>${['ID', 'Sana', 'Vazifa', 'Status', 'Progress'].map(l => html`<th class="px-6 py-4 border-b font-black uppercase text-slate-400 text-[10px]">${l}</th>`)}<th class="px-6 py-4 border-b text-right">Amallar</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${tasks.map(t => html`
                            <tr key=${t.id} class="hover:bg-slate-50 transition-colors">
                                <td class="px-6 py-4 font-mono text-slate-300 text-[10px]">${t.id}</td>
                                <td class="px-6 py-4 font-bold text-slate-600">${t.sana}</td>
                                <td class="px-6 py-4 font-black text-slate-800 text-[12px]">${t.vazifa}</td>
                                <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg font-black uppercase text-[9px] ${t.status === 'Bajarildi' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${t.status}</span></td>
                                <td class="px-6 py-4 font-black text-brand-500">${t.progress}%</td>
                                <td class="px-6 py-4 text-right"><div class="flex justify-end gap-1"><button onClick=${() => { setModalTask(t); setIsForm(true); }} class="p-2 text-brand-400 hover:text-brand-600"><${Lucide.Pencil} size="14" /></button><button onClick=${() => deleteTask(t.id)} class="p-2 text-slate-300 hover:text-red-500"><${Lucide.Trash2} size="14" /></button></div></td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>
            <${Modal} isOpen=${isForm} onClose=${() => setIsForm(false)} title=${modalTask ? "Tahrirlash" : "Yangi"}><${TaskForm} task=${modalTask} onSubmit=${(d) => { if(modalTask) updateTask(d); else addTask(d); setIsForm(false); }} onCancel=${() => setIsForm(false)} /><//>
        </div>
    `;
};

export const TrashPage = () => {
    const { deletedTasks = [], restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-8 animate-fade-in">
            <header class="flex justify-between items-center"><h2 class="text-3xl font-black text-slate-800 tracking-tight">Savat</h2><button onClick=${clearTrash} class="text-red-500 font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-red-50 transition-all">Tozalash</button></header>
            <div class="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">${deletedTasks.length === 0 ? html`<div class="py-20 flex flex-col items-center opacity-20 grayscale"><${Lucide.Recycle} size="60" /><p class="font-bold uppercase tracking-widest text-xs mt-4">Savat bo'sh</p></div>` : html`<div class="divide-y divide-slate-50">${deletedTasks.map(t => html`<div key=${t.id} class="p-8 flex justify-between items-center hover:bg-slate-50"><div><p class="font-bold text-slate-800 text-lg">${t.vazifa}</p><p class="text-[10px] text-slate-400 font-black uppercase mt-1">ID: ${t.id}</p></div><button onClick=${() => restoreTask(t.id)} class="bg-brand-50 text-brand-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-brand-900 hover:text-white transition-all">Tiklash</button></div>`)}</div>`}</div>
        </div>
    `;
};

export const HelpPage = () => html`
    <div class="space-y-12 animate-fade-in pb-20">
        <header><h2 class="text-3xl font-black text-slate-800 tracking-tight">Yordam</h2><p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Professional yo'riqnomalar</p></header>
        <div class="bg-brand-900 p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div class="absolute -right-10 -bottom-10 opacity-10"><${Lucide.Headset} size="200" /></div>
            <div class="relative z-10">
                <h3 class="text-3xl font-black mb-4 tracking-tight">Texnik yordam</h3>
                <p class="text-teal-100/60 font-medium mb-8 max-w-md italic">Tizim bo'yicha har qanday savollaringiz bo'lsa, bizga murojaat qiling.</p>
                <div class="flex gap-4"><a href="tel:+998999004430" class="bg-white text-brand-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">+998 99 900 44 30</a><a href="https://t.me/xisobotpro_admin" target="_blank" class="bg-teal-500/20 border border-teal-500/30 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Telegram</a></div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="bg-white p-8 rounded-[2rem] border"><h4 class="text-lg font-black text-slate-800 mb-4">Qo'llanma</h4><ul class="space-y-4 text-slate-500 text-sm font-medium"><li class="flex gap-3"><span class="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black">1</span> Dashboard orqali haftalik hisobotlarni PNG/PDF qilib yuklab oling.</li><li class="flex gap-3"><span class="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black">2</span> Vazifalar jadvalida katakchalarni bosib joyida tahrirlang.</li><li class="flex gap-3"><span class="w-6 h-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black">3</span> O'chirilgan vazifalar Savatdan qayta tiklanishi mumkin.</li></ul></div></div>
    </div>
`;
