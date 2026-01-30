
import React, { useState, useEffect } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format } from 'date-fns';

const html = htm.bind(React.createElement);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return html`
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 font-['Inter']">
                <div class="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
                    <h3 class="font-bold text-slate-800 text-lg tracking-tight">${title}</h3>
                    <button onClick=${onClose} class="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600"><${Lucide.X} size="20" /><//>
                </div>
                <div class="p-8 overflow-y-auto custom-scrollbar bg-white">${children}</div>
            </div>
        </div>
    `;
};

export const KPICard = ({ label, count, icon, color, bg }) => html`
    <div class="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group font-['Inter']">
        <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">${label}</p>
            <p class="text-3xl font-black text-slate-800 tracking-tighter">${count}</p>
        </div>
        <div class="p-4 ${bg} ${color} rounded-2xl shadow-inner group-hover:scale-105 transition-transform shrink-0 ml-4">
            <${Lucide[icon]} size="24" />
        </div>
    </div>
`;

export const TaskForm = ({ task, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        sana: format(new Date(), 'yyyy-MM-dd'),
        vazifa: '',
        tavsif: '',
        status: 'Rejada',
        prioritet: 'Muhum',
        progress: 0,
        dedlayn: '',
        izoh: ''
    });

    useEffect(() => {
        if (task) {
            setFormData({
                ...task,
                progress: parseInt(task.progress) || 0
            });
        }
    }, [task]);

    const handleSave = (e) => {
        e.preventDefault();
        // Defensive: ensure values are correct
        const payload = {
            ...formData,
            progress: Math.min(100, Math.max(0, parseInt(formData.progress) || 0))
        };
        onSubmit(payload);
    };

    const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300";

    return html`
        <form onSubmit=${handleSave} class="space-y-5 font-['Inter'] text-slate-700">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sana</label>
                    <input type="date" required value=${formData.sana} onChange=${e => setFormData({...formData, sana: e.target.value})} class="${inputClass}" />
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dedlayn</label>
                    <input type="date" value=${formData.dedlayn} onChange=${e => setFormData({...formData, dedlayn: e.target.value})} class="${inputClass}" />
                </div>
            </div>
            
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Vazifa Nomi</label>
                <input required value=${formData.vazifa} onChange=${e => setFormData({...formData, vazifa: e.target.value})} placeholder="Vazifani kiriting..." class="${inputClass}" />
            </div>

            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Batafsil ma'lumot</label>
                <textarea value=${formData.tavsif} onChange=${e => setFormData({...formData, tavsif: e.target.value})} placeholder="Vazifa haqida..." class="${inputClass}" rows="3"><//>
            </div>

            <div class="grid grid-cols-3 gap-4">
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Status</label>
                    <select value=${formData.status} onChange=${e => setFormData({...formData, status: e.target.value})} class="${inputClass}">
                        <option value="Rejada">Rejada</option>
                        <option value="Jarayonda">Jarayonda</option>
                        <option value="Bajarildi">Bajarildi</option>
                    </select>
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Prioritet</label>
                    <select value=${formData.prioritet} onChange=${e => setFormData({...formData, prioritet: e.target.value})} class="${inputClass}">
                        <option value="Juda muhum">Juda muhum</option>
                        <option value="Muhum">Muhum</option>
                        <option value="Muhum emas">Muhum emas</option>
                    </select>
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Progress %</label>
                    <input type="number" min="0" max="100" value=${formData.progress} onChange=${e => setFormData({...formData, progress: e.target.value})} class="${inputClass}" />
                </div>
            </div>

            <div class="flex gap-4 pt-6">
                <button type="button" onClick=${onCancel} class="flex-1 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-sm">BEKOR QILISH</button>
                <button type="submit" class="flex-1 py-3.5 bg-teal-700 text-white rounded-xl font-bold shadow-lg hover:bg-teal-800 transition-all active:scale-95 text-sm uppercase tracking-wider">SAQLASH</button>
            </div>
        </form>
    `;
};
