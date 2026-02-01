
import React, { useState, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskProvider, TaskContext } from './store.js';
// DIQQAT: Barcha sahifalar endi yagona views.js faylidan olinadi
import { Dashboard, TasksPage, TrashPage, HelpPage } from './views.js';
import { LoginScreen, UserProfile } from './ui.js';

const html = htm.bind(React.createElement);

const AppContent = () => {
    const [view, setView] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { loading, user, login, logout, deletedTasks = [] } = useContext(TaskContext);

    if (loading) return html`
        <div class="h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
            <div class="animate-spin text-brand-800 mb-4"><${Lucide.Loader2} size="48" /><//>
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Bulutli tizimga ulanmoqda...</p>
        </div>
    `;

    if (!user) return html`<${LoginScreen} onLogin=${login} />`;

    const NavItem = ({ id, icon, label, badge }) => {
        const IconComponent = Lucide[icon] || Lucide.HelpCircle;
        const isActive = view === id;
        return html`
            <button onClick=${() => { setView(id); setSidebarOpen(false); }} 
                    class="w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group mb-2
                    ${isActive ? 'bg-brand-900 text-white shadow-2xl' : 'text-slate-100/60 hover:bg-brand-800/50 hover:text-white'}">
                <div class="flex items-center">
                    <${IconComponent} size="20" class="mr-4 ${isActive ? 'text-teal-400' : 'text-teal-400/50'}" />
                    <span class="text-[11px] font-black uppercase tracking-widest">${label}</span>
                </div>
                ${badge > 0 && html`<span class="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">${badge}</span>`}
            </button>
        `;
    };

    return html`
        <div class="flex h-screen overflow-hidden bg-slate-50">
            <!-- Mobile Header -->
            <div class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-brand-900 z-40 flex items-center justify-between px-4 shadow-md">
                <span class="text-white font-black text-lg italic tracking-tight">XISOBOT PRO</span>
                <button onClick=${() => setSidebarOpen(!sidebarOpen)} class="text-white p-2"><${sidebarOpen ? Lucide.X : Lucide.Menu} size="24" /></button>
            </div>
            
            ${sidebarOpen && html`<div onClick=${() => setSidebarOpen(false)} class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"></div>`}

            <aside class="${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative w-80 h-full bg-brand-800 flex flex-col shadow-2xl z-50 transition-transform duration-300">
                <div class="p-10 border-b border-white/5 hidden lg:flex">
                    <h1 class="font-black text-2xl text-white tracking-tighter flex items-center italic">XISOBOT PRO</h1>
                </div>
                <nav class="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <${UserProfile} user=${user} onLogout=${logout} />
                    <${NavItem} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavItem} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <${NavItem} id="trash" icon="Trash2" label="Savat" badge=${deletedTasks.length} />
                    <div class="mt-8 mb-4 px-6"><hr class="border-white/5" /></div>
                    <${NavItem} id="help" icon="HelpCircle" label="Yordam" />
                </nav>
            </aside>

            <main class="flex-1 overflow-hidden relative pt-16 lg:pt-0">
                <div class="h-full overflow-y-auto p-4 md:p-12 custom-scrollbar">
                    <div class="max-w-[1400px] mx-auto">
                        ${view === 'dashboard' && html`<${Dashboard} />`}
                        ${view === 'tasks' && html`<${TasksPage} />`}
                        ${view === 'trash' && html`<${TrashPage} />`}
                        ${view === 'help' && html`<${HelpPage} />`}
                    </div>
                </div>
            </main>
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${TaskProvider}><${AppContent} /><//>`);
