
import React, { useState, useEffect } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format } from 'date-fns';

const html = htm.bind(React.createElement);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return html`
        <div class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
                <div class="px-6 md:px-8 py-4 md:py-5 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h3 class="font-extrabold text-slate-800 tracking-tight text-base md:text-lg line-clamp-1 mr-2">${title}</h3>
                    <button onClick=${onClose} class="p-2 text-slate-400 hover:text-red-500 transition-colors active:bg-slate-100 rounded-xl"><${Lucide.X} size="24" /><//>
                </div>
                <div class="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white">${children}</div>
            </div>
        </div>
    `;
};

export const KPICard = ({ label, count, icon, color }) => html`
    <div class="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">${label}</p>
            <p class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">${count}</p>
        </div>
        <div class="p-3 md:p-4 bg-slate-50 ${color} rounded-2xl shadow-inner"><${Lucide[icon]} size="24" /></div>
    </div>
`;

export const TaskForm = ({ task, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        sana: format(new Date(), 'yyyy-MM-dd'),
        vazifa: '',
        tavsif: '',
        status: 'Rejada',
        izoh: '',
        prioritet: 'Muhum emas',
        progress: 0,
        dedlayn: ''
    });

    useEffect(() => { if (task) setFormData({ ...task }); }, [task]);

    const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block";
    const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all";

    return html`
        <form onSubmit=${(e) => { e.preventDefault(); onSubmit(formData); }} class="space-y-5 md:space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label class="${labelClass}">Vazifa nomi</label>
                    <input required value=${formData.vazifa} onChange=${e => setFormData({...formData, vazifa: e.target.value})} class="${inputClass}" placeholder="Masalan: Hisobot tayyorlash" />
                </div>
                <div>
                    <label class="${labelClass}">Prioritet</label>
                    <select value=${formData.prioritet} onChange=${e => setFormData({...formData, prioritet: e.target.value})} class="${inputClass}">
                        <option value="Juda muhum">🔴 Juda muhum</option>
                        <option value="Muhum">🟡 Muhum</option>
                        <option value="Muhum emas">🟢 Muhum emas</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label class="${labelClass}">Sana</label>
                    <input type="date" required value=${formData.sana} onChange=${e => setFormData({...formData, sana: e.target.value})} class="${inputClass}" />
                </div>
                <div>
                    <label class="${labelClass}">Dedlayn</label>
                    <input type="date" value=${formData.dedlayn} onChange=${e => setFormData({...formData, dedlayn: e.target.value})} class="${inputClass}" />
                </div>
            </div>

            <div>
                <label class="${labelClass}">Tavsif (Vazifa detali)</label>
                <textarea rows="3" value=${formData.tavsif} onChange=${e => setFormData({...formData, tavsif: e.target.value})} class="${inputClass} resize-none" placeholder="Vazifa haqida batafsil..."></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label class="${labelClass}">Status</label>
                    <select value=${formData.status} onChange=${e => setFormData({...formData, status: e.target.value})} class="${inputClass}">
                        <option value="Rejada">Rejada</option>
                        <option value="Jarayonda">Jarayonda</option>
                        <option value="Bajarildi">Bajarildi</option>
                    </select>
                </div>
                <div>
                    <label class="${labelClass}">Progress %</label>
                    <input type="number" min="0" max="100" value=${formData.progress} onChange=${e => setFormData({...formData, progress: e.target.value})} class="${inputClass}" />
                </div>
            </div>

            <div>
                <label class="${labelClass}">Izoh (Komentariya)</label>
                <input value=${formData.izoh} onChange=${e => setFormData({...formData, izoh: e.target.value})} class="${inputClass}" placeholder="Qo'shimcha eslatmalar..." />
            </div>

            <div class="flex flex-col-reverse md:flex-row gap-4 pt-4">
                <button type="button" onClick=${onCancel} class="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-xs active:scale-95">Bekor qilish</button>
                <button type="submit" class="flex-1 py-4 bg-brand-900 text-white rounded-2xl font-black hover:bg-brand-800 shadow-xl shadow-brand-900/20 transition-all uppercase tracking-widest text-xs active:scale-95">Saqlash</button>
            </div>
        </form>
    `;
};
