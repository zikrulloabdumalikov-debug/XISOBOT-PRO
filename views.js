
import React, { useState, useContext } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskContext } from './store.js';
import { Modal } from './ui.js';
export { Dashboard } from './dashboard.js';
export { TasksPage } from './tasks-page.js';

const html = htm.bind(React.createElement);

// --- TRASH PAGE COMPONENT ---
export const TrashPage = () => {
    const { deletedTasks = [], restoreTask, clearTrash } = useContext(TaskContext);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleClear = () => {
        clearTrash();
        setIsConfirmOpen(false);
    };

    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in">
            <header class="flex justify-between items-center">
                <h2 class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Savat</h2>
                <button 
                    onClick=${() => (deletedTasks.length > 0 && setIsConfirmOpen(true))} 
                    aria-label="Savatni tozalash"
                    class="text-red-500 font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 dark:hover:bg-red-900/30 px-4 md:px-6 py-2 md:py-3 rounded-2xl transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none">
                    Tozalash
                </button>
            </header>

            <${Modal} isOpen=${isConfirmOpen} onClose=${() => setIsConfirmOpen(false)} title="Tozalashni tasdiqlang">
                <div class="text-center py-6">
                    <div class="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <${Lucide.AlertTriangle} size="32" />
                    </div>
                    <h4 class="text-lg font-black text-slate-800 dark:text-white mb-2">Ishonchingiz komilmi?</h4>
                    <p class="text-sm text-slate-400 dark:text-slate-500 font-bold mb-8">
                        Savatdagi <span class="text-red-500 font-black">${deletedTasks.length} ta vazifa</span> ma'lumotlar omboridan butunlay o'chiriladi. Ushbu amalni ortga qaytarib bo'lmaydi.
                    </p>
                    <div class="flex gap-4">
                        <button onClick=${() => setIsConfirmOpen(false)} class="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest text-xs focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none">Bekor qilish</button>
                        <button onClick=${handleClear} class="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-xl shadow-red-500/20 uppercase tracking-widest text-xs focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none">Ha, butunlay o'chirilsin</button>
                    </div>
                </div>
            <//>

            <div class="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
                ${(deletedTasks || []).length === 0 ? html`<div class="py-20 flex flex-col items-center justify-center opacity-20 grayscale dark:invert"><${Lucide.Recycle} size="60" strokeWidth="1" class="mb-6" /><p class="font-bold uppercase tracking-widest text-xs text-slate-800 dark:text-white">Savat bo'sh</p></div>` : html`
                    <div class="divide-y divide-slate-50 dark:divide-slate-700">
                        ${deletedTasks.map(t => html`
                            <div key=${t.id} class="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group">
                                <div class="flex items-center gap-4 md:gap-6"><div class="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-red-400 transition-all shrink-0"><${Lucide.FileX} size="20" /></div><div><p class="font-bold text-slate-800 dark:text-white text-base md:text-lg group-hover:text-red-600 transition-colors line-clamp-1">${t.vazifa}</p><p class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">${t.status} • ID: ${t.id}</p></div></div>
                                <button onClick=${() => restoreTask(t.id)} aria-label="Vazifani tiklash" class="w-full md:w-auto bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-brand-900 hover:text-white transition-all shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">Tiklash</button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};

// --- HELP PAGE COMPONENT ---
export const HelpPage = () => {
    const manualSteps = [
        {
            title: "Monitoring (Dashboard)",
            icon: "LayoutDashboard",
            steps: [
                "Asosiy ekran statistika (KPI) kartalarini ko'rsatadi.",
                "Sana filtridan foydalanib, ma'lum davr bo'yicha hisobotlarni ko'ring.",
                "Eksport (PNG/PDF) tugmalari orqali vizual hisobotni saqlab oling."
            ]
        },
        {
            title: "Vazifalar (Tasks)",
            icon: "ListTodo",
            steps: [
                "'Yangi' tugmasi orqali vazifa qo'shing.",
                "Jadvaldagi istalgan katakchani bosib, uni joyida tahrirlang (Inline edit).",
                "Excel tugmasi orqali barcha ma'lumotlarni jadval ko'rinishida yuklang."
            ]
        },
        {
            title: "Savat va Xavfsizlik",
            icon: "Trash2",
            steps: [
                "O'chirilgan vazifalar avval Savatga tushadi.",
                "Savatdan vazifani qayta tiklash yoki 'Tozalash' orqali butunlay o'chirish mumkin.",
                "Ma'lumotlar avtomatik tarzda Google hisobingiz bilan sinxronlanadi."
            ]
        }
    ];

    return html`
        <div class="space-y-8 md:space-y-12 animate-fade-in pb-20">
            <header>
                <h2 class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Yordam va Yo'riqnomalar</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Tizimdan professional foydalanish markazi</p>
            </header>

            <div class="bg-brand-900 p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl shadow-brand-900/40 relative overflow-hidden group">
                <div class="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <${Lucide.Headset} size="200" />
                </div>
                <div class="relative z-10">
                    <div class="flex items-center gap-3 mb-6">
                        <span class="px-3 py-1 bg-teal-400 text-brand-900 text-[9px] font-black uppercase rounded-lg tracking-widest">Support Online</span>
                    </div>
                    <h3 class="text-2xl md:text-3xl font-black mb-4 tracking-tight">Texnik yordam kerakmi?</h3>
                    <p class="text-teal-100/60 font-medium mb-8 max-w-md">Agar tizim bilan bog'liq muammo yoki takliflaringiz bo'lsa, mutaxassisimiz bilan bog'laning.</p>
                    
                    <div class="flex flex-col sm:flex-row gap-4">
                        <a href="tel:+998999004430" class="flex items-center justify-center gap-3 bg-white text-brand-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none">
                            <${Lucide.Phone} size="18" /> +998 99 900 44 30
                        </a>
                        <a href="https://t.me/xisobotpro_admin" target="_blank" class="flex items-center justify-center gap-3 bg-teal-500/20 border border-teal-500/30 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-500/40 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none">
                            <${Lucide.Send} size="18" /> Telegram
                        </a>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                ${manualSteps.map(m => html`
                    <div key=${m.title} class="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div class="w-12 h-12 bg-slate-50 dark:bg-slate-700 text-brand-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <${Lucide[m.icon]} size="24" />
                        </div>
                        <h4 class="text-lg font-black text-slate-800 dark:text-white mb-6 tracking-tight">${m.title}</h4>
                        <div class="space-y-4">
                            ${m.steps.map((step, idx) => html`
                                <div key=${idx} class="flex gap-4">
                                    <span class="w-6 h-6 shrink-0 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 dark:text-slate-300">${idx + 1}</span>
                                    <p class="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">${step}</p>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}
            </div>
            
            <div class="text-center py-10 opacity-30">
                <p class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-800 dark:text-white">Xisobot PRO - Sizning raqamli yordamchingiz</p>
            </div>
        </div>
    `;
};
