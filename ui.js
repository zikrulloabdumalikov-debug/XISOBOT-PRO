
import React, { useState, useEffect } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format } from 'date-fns';

const html = htm.bind(React.createElement);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return html`
        <div class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div class="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 class="font-bold text-slate-800 tracking-tight">${title}</h3>
                    <button onClick=${onClose} class="p-1 text-slate-400 hover:text-slate-600 transition-colors"><${Lucide.X} size="20" /><//>
                </div>
                <div class="p-6 overflow-y-auto custom-scrollbar bg-white">${children}</div>
            </div>
        </div>
    `;
};

export const KPICard = ({ label, count, icon, color }) => html`
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">${label}</p>
            <p class="text-3xl font-black text-slate-800 tracking-tight">${count}</p>
        </div>
        <div class="p-4 bg-slate-50 ${color} rounded-2xl"><${Lucide[icon]} size="24" /></div>
    </div>
`;

export const TaskForm = ({ task, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        sana: format(new Date(), 'yyyy-MM-dd'),
        vazifa: '',
        status: 'Rejada',
        progress: 0,
        dedlayn: ''
    });

    useEffect(() => { if (task) setFormData({ ...task }); }, [task]);

    const inputClass = "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all";

    return html`
        <form onSubmit=${(e) => { e.preventDefault(); onSubmit(formData); }} class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Sana</label>
                    <input type="date" required value=${formData.sana} onChange=${e => setFormData({...formData, sana: e.target.value})} class="${inputClass}" />
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Dedlayn</label>
                    <input type="date" value=${formData.dedlayn} onChange=${e => setFormData({...formData, dedlayn: e.target.value})} class="${inputClass}" />
                </div>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Vazifa</label>
                <input required value=${formData.vazifa} onChange=${e => setFormData({...formData, vazifa: e.target.value})} class="${inputClass}" placeholder="Vazifani kiriting..." />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                    <select value=${formData.status} onChange=${e => setFormData({...formData, status: e.target.value})} class="${inputClass}">
                        <option value="Rejada">Rejada</option>
                        <option value="Jarayonda">Jarayonda</option>
                        <option value="Bajarildi">Bajarildi</option>
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Progress %</label>
                    <input type="number" min="0" max="100" value=${formData.progress} onChange=${e => setFormData({...formData, progress: e.target.value})} class="${inputClass}" />
                </div>
            </div>
            <div class="flex gap-4 pt-6">
                <button type="button" onClick=${onCancel} class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Bekor qilish</button>
                <button type="submit" class="flex-1 py-3 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 transition-shadow">Saqlash</button>
            </div>
        </form>
    `;
};
