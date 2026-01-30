
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

    if (loading) return html`<div class="h-screen flex items-center justify-center bg-slate-50"><div class="animate-spin text-teal-700"><${Lucide.Loader2} size="64" /><//><//>`;

    const NavBtn = ({ id, icon, label }) => html`
        <button onClick=${() => setView(id)} class="w-full flex items-center px-6 py-4.5 rounded-[1.5rem] transition-all duration-500 relative group ${view === id ? 'bg-teal-900 text-white shadow-2xl scale-105' : 'hover:bg-teal-700/40 text-teal-100/60 hover:text-white'}">
            <${Lucide[icon]} size="22" class="mr-5 group-hover:rotate-12 transition-transform" /> 
            <span class="font-black text-[11px] uppercase tracking-[0.2em]">${label}</span>
            ${view === id && html`<div class="absolute right-4 w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)] animate-pulse"></div>`}
        </button>
    `;

    return html`
        <div class="flex h-screen bg-slate-50 overflow-hidden font-['Inter']">
            <!-- Sidebar -->
            <aside class="hidden md:flex flex-col w-80 bg-teal-800 text-white shadow-[10px_0_50px_rgba(0,0,0,0.1)] z-50">
                <div class="p-10 border-b border-teal-700/30 flex items-center gap-6">
                    <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer group">
                        <span class="text-teal-800 font-black text-3xl group-hover:scale-110 transition-transform">X</span>
                    </div>
                    <div>
                        <h1 class="font-black text-2xl tracking-tighter leading-none mb-1">XISOBOT</h1>
                        <p class="text-[10px] text-teal-400 font-black tracking-[0.5em] uppercase opacity-70">PRO VERSION</p>
                    </div>
                </div>

                <div class="p-6">
                    ${user ? html`
                        <div class="flex items-center gap-4 bg-teal-900/60 p-4 rounded-[2rem] border border-teal-700/40 shadow-inner group">
                            <img src=${user.picture} class="w-14 h-14 rounded-2xl border-2 border-teal-500 shadow-xl group-hover:scale-110 transition-transform" />
                            <div class="flex-1 overflow-hidden">
                                <p class="text-[13px] font-black truncate">${user.name}</p>
                                <p class="text-[9px] font-black uppercase tracking-widest flex items-center mt-1.5 ${syncing ? 'text-amber-400' : 'text-teal-400'}">
                                    ${syncing ? html`<${Lucide.Loader2} size="10" class="animate-spin mr-1.5" /> Sinx...` : html`<${Lucide.Cloud} size="10" class="mr-1.5 text-green-400" /> Sinxronlangan`}
                                </p>
                            </div>
                            <button onClick=${logout} class="text-teal-400 hover:text-white transition-all p-2.5 hover:bg-red-500/20 rounded-xl" title="Chiqish"><${Lucide.LogOut} size="18" /><//>
                        </div>
                    ` : html`
                        <button onClick=${login} class="w-full py-5 bg-white text-teal-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all active:scale-95 border-b-4 border-teal-100">GOOGLE BILAN ULASH</button>
                    `}
                </div>

                <nav class="flex-1 p-6 space-y-4">
                    <${NavBtn} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavBtn} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <div class="pt-8 mt-8 border-t border-teal-700/20">
                        <button onClick=${() => setView('trash')} class="w-full flex items-center justify-between px-6 py-4.5 rounded-[1.5rem] transition-all duration-500 ${view === 'trash' ? 'bg-red-900/40 shadow-2xl' : 'hover:bg-red-900/10 text-teal-100/60'}">
                            <div class="flex items-center"><${Lucide.Trash2} size="22" class="mr-5" /> <span class="font-black text-[11px] uppercase tracking-[0.2em]">Savat</span></div>
                            ${deletedTasks.length > 0 && html`<span class="bg-red-500 text-[10px] font-black px-3 py-1 rounded-lg shadow-xl animate-pulse">${deletedTasks.length}</span>`}
                        </button>
                    </div>
                </nav>

                <div class="p-10 border-t border-teal-700/20 text-center">
                    <p class="text-[10px] font-black uppercase tracking-[0.6em] text-teal-400 opacity-30">by Zikrulloh</p>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 overflow-y-auto p-10 md:p-20 custom-scrollbar relative">
                <div class="max-w-7xl mx-auto pb-40">
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
