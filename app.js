
import React, { useState, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskProvider, TaskContext } from './store.js';
import { Dashboard, TasksPage, TrashPage } from './views.js';

const html = htm.bind(React.createElement);

const App = () => {
    const [view, setView] = useState('dashboard');
    const { loading, deletedTasks = [] } = useContext(TaskContext);

    if (loading) return html`
        <div class="h-screen flex flex-col items-center justify-center bg-white">
            <div class="animate-spin text-teal-700 mb-4"><${Lucide.Loader2} size="48" /><//>
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Tizim yuklanmoqda...</p>
        </div>
    `;

    const NavItem = ({ id, icon, label, badge }) => html`
        <button onClick=${() => setView(id)} 
                class="w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group ${view === id ? 'bg-teal-900 text-white shadow-2xl' : 'text-teal-100/60 hover:bg-teal-700/50 hover:text-white'}">
            <div class="flex items-center">
                <${Lucide[icon]} size="20" class="mr-4 ${view === id ? 'text-teal-400' : 'text-teal-400/50 group-hover:text-teal-300'}" />
                <span class="text-xs font-black uppercase tracking-widest">${label}</span>
            </div>
            ${badge > 0 && html`<span class="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg">${badge}</span>`}
        </button>
    `;

    return html`
        <div class="flex h-screen overflow-hidden bg-slate-50">
            <!-- Sidebar -->
            <aside class="w-80 bg-teal-800 flex flex-col shadow-2xl z-50">
                <div class="p-10 border-b border-teal-700/50">
                    <h1 class="font-black text-2xl text-white tracking-tighter flex items-center">
                        <div class="w-8 h-8 bg-teal-400 rounded-xl mr-3 flex items-center justify-center shadow-lg shadow-teal-400/20">
                            <div class="w-2 h-2 bg-teal-900 rounded-full animate-pulse"></div>
                        </div>
                        XISOBOT PRO
                    </h1>
                </div>
                <nav class="p-6 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                    <${NavItem} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavItem} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <${NavItem} id="trash" icon="Trash2" label="Savat" badge=${deletedTasks.length} />
                </nav>
                <div class="p-10 border-t border-teal-700/50">
                    <p class="text-[9px] font-black text-teal-400 uppercase tracking-[0.3em] mb-1">Dasturchi</p>
                    <p class="text-xs font-bold text-white tracking-tight">by Zikrulloh</p>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
                <div class="max-w-7xl mx-auto pb-20 animate-in">
                    ${view === 'dashboard' && html`<${Dashboard} />`}
                    ${view === 'tasks' && html`<${TasksPage} />`}
                    ${view === 'trash' && html`<${TrashPage} />`}
                </div>
            </main>
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`
    <${TaskProvider}><${App} /><//>
`);
