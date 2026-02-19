
import React, { useState, useEffect } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format } from 'date-fns';

const html = htm.bind(React.createElement);

export const LoginScreen = ({ onLogin }) => html`
    <div class="h-screen w-full flex items-center justify-center bg-brand-900 p-4">
        <div class="max-w-md w-full bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl p-10 text-center animate-fade-in border border-white/20 dark:border-slate-700">
            <div class="w-20 h-20 bg-brand-50 dark:bg-slate-700 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-inner">
                <div class="w-4 h-4 bg-brand-500 rounded-full animate-pulse"></div>
            </div>
            <h1 class="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tighter">XISOBOT PRO</h1>
            <p class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-10 italic">Cloud Synchronized Dashboard</p>
            
            <button onClick=${onLogin} class="w-full flex items-center justify-center gap-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-xl active:scale-95 group focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" loading="lazy" class="w-5 h-5" alt="Google Logo" />
                Google orqali kirish
            </button>
            
            <p class="mt-10 text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.3em]">Haftalik hisobot tizimi v2.0</p>
        </div>
    </div>
`;

export const UserProfile = ({ user, onLogout }) => html`
    <div class="p-6 bg-brand-900/40 rounded-3xl border border-white/5 mb-6 flex items-center justify-between group">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl overflow-hidden border-2 border-brand-500/30">
                <img src="${user.photoURL}" loading="lazy" alt="Foydalanuvchi profil rasmi" class="w-full h-full object-cover" />
            </div>
            <div class="flex flex-col">
                <span class="text-[11px] font-black text-white line-clamp-1">${user.displayName}</span>
                <!-- Contrast Fix: Changed text-brand-400 to text-brand-50 -->
                <span class="text-[9px] font-bold text-brand-50 uppercase tracking-wider">PRO Account</span>
            </div>
        </div>
        <button onClick=${onLogout} aria-label="Tizimdan chiqish" class="p-2 text-brand-400 hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg focus-visible:outline-none">
            <${Lucide.LogOut} size="16" />
        </button>
    </div>
`;

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return html`
        <div class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                <div class="px-6 md:px-8 py-4 md:py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                    <h3 id="modal-title" class="font-extrabold text-slate-800 dark:text-white tracking-tight text-base md:text-lg line-clamp-1 mr-2">${title}</h3>
                    <button onClick=${onClose} aria-label="Yopish" class="p-2 text-slate-500 hover:text-red-500 transition-colors active:bg-slate-100 dark:active:bg-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"><${Lucide.X} size="24" /><//>
                </div>
                <div class="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800">${children}</div>
            </div>
        </div>
    `;
};

export const KPICard = ({ label, count, icon, color }) => html`
    <div class="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div>
            <!-- Contrast Fix: Changed text-slate-500 to text-slate-600 -->
            <p class="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] mb-1.5">${label}</p>
            <p class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">${count}</p>
        </div>
        <div class="p-3 md:p-4 bg-slate-50 dark:bg-slate-700/50 ${color} rounded-2xl shadow-inner"><${Lucide[icon]} size="24" aria-hidden="true" /></div>
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

    // Mantiq: Status o'zgarganda Progressni avtomatik moslash
    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        let newProgress = formData.progress;

        if (newStatus === 'Rejada') newProgress = 0;
        else if (newStatus === 'Jarayonda' && (formData.progress === 0 || formData.progress === 100)) newProgress = 50;
        else if (newStatus === 'Bajarildi') newProgress = 100;

        setFormData({ ...formData, status: newStatus, progress: newProgress });
    };

    // Mantiq: Progress o'zgarganda Statusni avtomatik moslash + Validatsiya (0-100 Int)
    const handleProgressChange = (e) => {
        let valStr = e.target.value;
        valStr = valStr.replace(/[^0-9]/g, '');
        if (valStr === '') valStr = '0';
        let val = parseInt(valStr, 10);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;

        let newStatus = formData.status;
        if (val === 0) newStatus = 'Rejada';
        else if (val > 0 && val < 100) newStatus = 'Jarayonda';
        else if (val === 100) newStatus = 'Bajarildi';

        setFormData({ ...formData, progress: val, status: newStatus });
    };

    const labelClass = "text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block";
    const inputClass = "w-full p-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-600 text-slate-800 dark:text-white transition-all";

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
                <div><label class="${labelClass}">Sana</label><input type="date" required value=${formData.sana} onChange=${e => setFormData({...formData, sana: e.target.value})} class="${inputClass} dark:invert-0" /></div>
                <div><label class="${labelClass}">Dedlayn</label><input type="date" value=${formData.dedlayn} onChange=${e => setFormData({...formData, dedlayn: e.target.value})} class="${inputClass}" /></div>
            </div>

            <div><label class="${labelClass}">Tavsif</label><textarea rows="3" value=${formData.tavsif} onChange=${e => setFormData({...formData, tavsif: e.target.value})} class="${inputClass} resize-none"></textarea></div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label class="${labelClass}">Status</label>
                    <select value=${formData.status} onChange=${handleStatusChange} class="${inputClass}">
                        <option value="Rejada">Rejada</option>
                        <option value="Jarayonda">Jarayonda</option>
                        <option value="Bajarildi">Bajarildi</option>
                    </select>
                </div>
                <div>
                    <label class="${labelClass}">Progress %</label>
                    <div class="flex items-center gap-2">
                        <input type="number" min="0" max="100" value=${formData.progress} onChange=${handleProgressChange} class="${inputClass}" />
                        <input type="range" min="0" max="100" value=${formData.progress} onChange=${handleProgressChange} class="w-24 accent-brand-500 h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>
            </div>

            <div><label class="${labelClass}">Izoh</label><input value=${formData.izoh} onChange=${e => setFormData({...formData, izoh: e.target.value})} class="${inputClass}" /></div>

            <div class="flex flex-col-reverse md:flex-row gap-4 pt-4">
                <button type="button" onClick=${onCancel} class="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none transition-all">Bekor qilish</button>
                <button type="submit" class="flex-1 py-4 bg-brand-900 text-white rounded-2xl font-black shadow-xl shadow-brand-900/20 uppercase tracking-widest text-xs hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none transition-all">Saqlash</button>
            </div>
        </form>
    `;
};
