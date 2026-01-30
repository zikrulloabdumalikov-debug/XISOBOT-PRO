
import React, { useState } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format } from 'date-fns';

const html = htm.bind(React.createElement);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return html`
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                <div class="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
                    <h3 class="font-black text-slate-800 tracking-tight">${title}</h3>
                    <button onClick=${onClose} class="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><${Lucide.X} size="20" /><//>
                </div>
                <div class="p-8 overflow-y-auto custom-scrollbar">${children}</div>
            </div>
        </div>
    `;
};

export const KPICard = ({ label, count, icon, color, bg }) => html`
    <div class="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group">
        <div>
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">${label}</p>
            <p class="text-3xl font-black text-slate-800">${count}</p>
        </div>
        <div class="p-5 ${bg} ${color} rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
            <${Lucide[icon]} size="28" />
        </div>
    </div>
`;

export const TaskForm = ({ task, onSubmit, onCancel }) => {
    const [data, setData] = useState(task || { vazifa: '', tavsif: '', status: 'Rejada', prioritet: 'Muhum', progress: 0, date: format(new Date(), 'yyyy-MM-dd'), dedlayn: '', izoh: '' });
    return html`
        <form onSubmit=${(e) => { e.preventDefault(); onSubmit(data); }} class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sana</label>
                    <input type="date" value=${data.date} onChange=${e => setData({...data, date: e.target.value})} class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 outline-none" />
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dedlayn</label>
                    <input type="date" value=${data.dedlayn} onChange=${e => setData({...data, dedlayn: e.target.value})} class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 outline-none" />
                </div>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vazifa Nomi</label>
                <input required value=${data.vazifa} onChange=${e => setData({...data, vazifa: e.target.value})} placeholder="Vazifani kiriting..." class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 outline-none" />
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tavsif</label>
                <textarea value=${data.tavsif} onChange=${e => setData({...data, tavsif: e.target.value})} placeholder="Batafsil ma'lumot..." class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 outline-none" rows="3"><//>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select value=${data.status} onChange=${e => setData({...data, status: e.target.value})} class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                        <option>Rejada</option><option>Jarayonda</option><option>Bajarildi</option>
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioritet</label>
                    <select value=${data.prioritet} onChange=${e => setData({...data, prioritet: e.target.value})} class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                        <option>Juda muhum</option><option>Muhum</option><option>Muhum emas</option>
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Progress %</label>
                    <input type="number" min="0" max="100" value=${data.progress} onChange=${e => setData({...data, progress: parseInt(e.target.value)})} class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none" />
                </div>
            </div>
            <div class="flex gap-4 pt-6">
                <button type="button" onClick=${onCancel} class="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">BEKOR QILISH</button>
                <button type="submit" class="flex-1 py-4 bg-teal-700 text-white rounded-2xl font-black shadow-lg hover:bg-teal-800 transition-all hover:scale-[1.02] active:scale-95">SAQLASH</button>
            </div>
        </form>
    `;
};
