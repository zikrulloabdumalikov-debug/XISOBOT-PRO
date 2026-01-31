
import React, { useState, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskProvider, TaskContext } from './store.js';
import { Dashboard, TasksPage, TrashPage } from './views.js';

const html = htm.bind(React.createElement);

const AppContent = () => {
    const [view, setView] = useState('dashboard');
    const { loading, deletedTasks = [] } = useContext(TaskContext);

    if (loading) return html`
        <div class="h-screen flex flex-col items-center justify-center bg-white">
            <div class="animate-spin text-brand-800 mb-4"><${Lucide.Loader2} size="48" /><//>
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Tizim yuklanmoqda...</p>
        </div>
    `;

    const NavItem = ({ id, icon, label, badge }) => html`
        <button onClick=${() => setView(id)} 
                class="w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group ${view === id ? 'bg-brand-900 text-white shadow-2xl shadow-brand-900/40' : 'text-slate-100/60 hover:bg-brand-800/50 hover:text-white'}">
            <div class="flex items-center">
                <${Lucide[icon]} size="20" class="mr-4 ${view === id ? 'text-teal-400' : 'text-teal-400/50 group-hover:text-teal-300'}" />
                <span class="text-[11px] font-black uppercase tracking-widest">${label}</span>
            </div>
            ${badge > 0 && html`<span class="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg">${badge}</span>`}
        </button>
    `;

    return html`
        <div class="flex h-screen overflow-hidden bg-slate-50">
            <aside class="w-80 bg-brand-800 flex flex-col shadow-2xl z-50">
                <div class="p-10 border-b border-brand-900/20">
                    <h1 class="font-black text-2xl text-white tracking-tighter flex items-center italic">
                        <div class="w-10 h-10 bg-brand-500 rounded-2xl mr-3 flex items-center justify-center shadow-lg shadow-brand-500/20 rotate-3">
                            <div class="w-2.5 h-2.5 bg-brand-900 rounded-full animate-pulse"></div>
                        </div>
                        XISOBOT PRO
                    </h1>
                </div>
                <nav class="p-6 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                    <${NavItem} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavItem} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <${NavItem} id="trash" icon="Trash2" label="Savat" badge=${deletedTasks.length} />
                </nav>
                <div class="p-10 border-t border-brand-900/20">
                    <p class="text-[9px] font-black text-brand-500 uppercase tracking-[0.3em] mb-1">Muallif</p>
                    <p class="text-xs font-bold text-white tracking-tight">by Zikrulloh</p>
                </div>
            </aside>

            <main class="flex-1 overflow-hidden relative">
                <div class="h-full overflow-y-auto p-12 custom-scrollbar">
                    <div class="max-w-[1400px] mx-auto pb-20">
                        ${view === 'dashboard' && html`<${Dashboard} />`}
                        ${view === 'tasks' && html`<${TasksPage} />`}
                        ${view === 'trash' && html`<${TrashPage} />`}
                    </div>
                </div>
            </main>
        </div>
    `;
};

const init = () => {
    const container = document.getElementById('root');
    if (container) {
        const root = createRoot(container);
        root.render(html`
            <${TaskProvider}>
                <${AppContent} />
            <//>
        `);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
