
import React, { useState, useEffect } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format } from 'date-fns';

const html = htm.bind(React.createElement);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return html`
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                <div class="px-10 py-8 border-b flex justify-between items-center bg-slate-50/50">
                    <h3 class="font-black text-slate-800 text-xl tracking-tight">${title}</h3>
                    <button onClick=${onClose} class="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-600"><${Lucide.X} size="24" /><//>
                </div>
                <div class="p-10 overflow-y-auto custom-scrollbar bg-white">${children}</div>
            </div>
        </div>
    `;
};

export const KPICard = ({ label, count, icon, color, bg }) => html`
    <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group">
        <div>
            <p class="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">${label}</p>
            <p class="text-4xl font-black text-slate-800 tracking-tighter">${count}</p>
        </div>
        <div class="p-6 ${bg} ${color} rounded-[2rem] shadow-inner group-hover:scale-110 transition-transform duration-500">
            <${Lucide[icon]} size="32" />
        </div>
    </div>
`;

export const TaskForm = ({ task, onSubmit, onCancel }) => {
    // Default qiymatlarda property nomlari 'sana' va 'dedlayn' ekanligiga ishonch hosil qilamiz
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
        if (task) setFormData(task);
    }, [task]);

    const handleSave = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return html`
        <form onSubmit=${handleSave} class="space-y-6">
            <div class="grid grid-cols-2 gap-5">
                <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sana</label>
                    <input type="date" required value=${formData.sana} onChange=${e => setFormData({...formData, sana: e.target.value})} class="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all" />
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dedlayn</label>
                    <input type="date" value=${formData.dedlayn} onChange=${e => setFormData({...formData, dedlayn: e.target.value})} class="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all" />
                </div>
            </div>
            
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vazifa Nomi</label>
                <input required value=${formData.vazifa} onChange=${e => setFormData({...formData, vazifa: e.target.value})} placeholder="Vazifani kiriting..." class="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all" />
            </div>

            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tavsif / Detallar</label>
                <textarea value=${formData.tavsif} onChange=${e => setFormData({...formData, tavsif: e.target.value})} placeholder="Batafsil ma'lumot..." class="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all" rows="3"><//>
            </div>

            <div class="grid grid-cols-3 gap-5">
                <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select value=${formData.status} onChange=${e => setFormData({...formData, status: e.target.value})} class="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-3xl text-sm outline-none">
                        <option value="Rejada">Rejada</option>
                        <option value="Jarayonda">Jarayonda</option>
                        <option value="Bajarildi">Bajarildi</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioritet</label>
                    <select value=${formData.prioritet} onChange=${e => setFormData({...formData, prioritet: e.target.value})} class="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-3xl text-sm outline-none">
                        <option value="Juda muhum">Juda muhum</option>
                        <option value="Muhum">Muhum</option>
                        <option value="Muhum emas">Muhum emas</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Progress %</label>
                    <input type="number" min="0" max="100" value=${formData.progress} onChange=${e => setFormData({...formData, progress: parseInt(e.target.value) || 0})} class="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-3xl text-sm outline-none" />
                </div>
            </div>

            <div class="flex gap-5 pt-8">
                <button type="button" onClick=${onCancel} class="flex-1 py-5 border border-slate-200 rounded-3xl font-bold text-slate-500 hover:bg-slate-50 transition-all">BEKOR QILISH</button>
                <button type="submit" class="flex-1 py-5 bg-teal-700 text-white rounded-3xl font-black shadow-xl hover:bg-teal-800 transition-all hover:scale-[1.02] active:scale-95">TASDIQLASH</button>
            </div>
        </form>
    `;
};
