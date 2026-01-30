
import React, { useState, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskProvider, TaskContext } from './store.js';
import { Dashboard, TasksPage, TrashPage } from './views.js';

const html = htm.bind(React.createElement);

const App = () => {
    const [view, setView] = useState('dashboard');
    const { user, login, logout, syncing, deletedTasks, loading } = useContext(TaskContext);

    if (loading) return html`
        <div class="h-screen flex flex-col items-center justify-center bg-slate-50">
            <div class="animate-spin text-teal-700 mb-6"><${Lucide.Loader2} size="80" /><//>
            <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Yuklanmoqda...</p>
        </div>
    `;

    const NavBtn = ({ id, icon, label }) => html`
        <button onClick=${() => setView(id)} class="w-full flex items-center px-7 py-5 rounded-[2rem] transition-all duration-500 relative group ${view === id ? 'bg-teal-900 text-white shadow-2xl scale-105' : 'hover:bg-teal-700/30 text-teal-100/60 hover:text-white'}">
            <${Lucide[icon]} size="24" class="mr-6 group-hover:rotate-12 transition-transform" /> 
            <span class="font-black text-[11px] uppercase tracking-[0.25em]">${label}</span>
            ${view === id && html`<div class="absolute right-5 w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,1)] animate-pulse"></div>`}
        </button>
    `;

    return html`
        <div class="flex h-screen bg-slate-50 overflow-hidden font-['Inter']">
            <!-- Sidebar -->
            <aside class="hidden md:flex flex-col w-85 bg-teal-800 text-white shadow-[15px_0_60px_rgba(0,0,0,0.15)] z-50">
                <div class="p-12 border-b border-teal-700/30 flex items-center gap-7">
                    <div class="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-6 hover:rotate-0 transition-all duration-500 cursor-pointer group">
                        <span class="text-teal-800 font-black text-4xl group-hover:scale-125 transition-transform">X</span>
                    </div>
                    <div>
                        <h1 class="font-black text-2xl tracking-tighter leading-none mb-1">HISOBOT</h1>
                        <p class="text-[10px] text-teal-400 font-black tracking-[0.6em] uppercase opacity-80">PRO TIZIMI</p>
                    </div>
                </div>

                <div class="p-7">
                    ${user ? html`
                        <div class="flex items-center gap-5 bg-teal-900/60 p-5 rounded-[2.5rem] border border-teal-700/40 shadow-inner group">
                            <img src=${user.picture} class="w-16 h-16 rounded-[1.2rem] border-2 border-teal-500 shadow-2xl group-hover:scale-110 transition-transform" />
                            <div class="flex-1 overflow-hidden">
                                <p class="text-[15px] font-black truncate">${user.name}</p>
                                <p class="text-[10px] font-black uppercase tracking-widest flex items-center mt-2 ${syncing ? 'text-amber-400' : 'text-teal-400'}">
                                    ${syncing ? html`<${Lucide.Loader2} size="12" class="animate-spin mr-2" /> Sinxronizatsiya...` : html`<${Lucide.Cloud} size="12" class="mr-2 text-green-400" /> Sinxronlangan`}
                                </p>
                            </div>
                            <button onClick=${logout} class="text-teal-400 hover:text-white transition-all p-3 hover:bg-red-500/20 rounded-2xl" title="Chiqish"><${Lucide.LogOut} size="20" /><//>
                        </div>
                    ` : html`
                        <button onClick=${login} class="w-full py-6 bg-white text-teal-800 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.25em] shadow-2xl hover:scale-105 transition-all active:scale-95 border-b-6 border-teal-100">GOOGLE BILAN ULASH</button>
                    `}
                </div>

                <nav class="flex-1 p-7 space-y-5">
                    <${NavBtn} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavBtn} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <div class="pt-10 mt-10 border-t border-teal-700/20">
                        <button onClick=${() => setView('trash')} class="w-full flex items-center justify-between px-7 py-5 rounded-[2rem] transition-all duration-500 ${view === 'trash' ? 'bg-red-900/40 shadow-2xl' : 'hover:bg-red-900/10 text-teal-100/60'}">
                            <div class="flex items-center"><${Lucide.Trash2} size="24" class="mr-6" /> <span class="font-black text-[11px] uppercase tracking-[0.25em]">Savat</span></div>
                            ${deletedTasks.length > 0 && html`<span class="bg-red-500 text-[10px] font-black px-4 py-1.5 rounded-xl shadow-2xl animate-pulse">${deletedTasks.length}</span>`}
                        </button>
                    </div>
                </nav>

                <div class="p-12 border-t border-teal-700/20 text-center">
                    <p class="text-[10px] font-black uppercase tracking-[0.8em] text-teal-400 opacity-20">by Zikrulloh</p>
                </div>
            </aside>

            <!-- Main Content Area -->
            <main class="flex-1 overflow-y-auto p-12 md:p-24 custom-scrollbar relative">
                <div class="max-w-7xl mx-auto pb-48">
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
    <${TaskProvider}>
        <${App} />
    <//>
`);
