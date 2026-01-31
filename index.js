
import React, { useState, useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskProvider, TaskContext } from './store.js';
import { Dashboard, TasksPage, TrashPage } from './views.js';

const html = htm.bind(React.createElement);

const AppContent = () => {
    const [view, setView] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { loading, deletedTasks = [] } = useContext(TaskContext);

    // Ekranni o'lchami o'zgarganda sidebar holatini to'g'irlash
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(false); // Katta ekranda sidebar doim ochiq (layout orqali)
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) return html`
        <div class="h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
            <div class="animate-spin text-brand-800 mb-4"><${Lucide.Loader2} size="48" /><//>
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Tizim yuklanmoqda...</p>
        </div>
    `;

    const NavItem = ({ id, icon, label, badge }) => {
        const IconComponent = Lucide[icon] || Lucide.HelpCircle;
        const isActive = view === id;
        return html`
            <button onClick=${() => { setView(id); setSidebarOpen(false); }} 
                    class="w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group mb-2
                    ${isActive ? 'bg-brand-900 text-white shadow-2xl shadow-brand-900/40' : 'text-slate-100/60 hover:bg-brand-800/50 hover:text-white'}">
                <div class="flex items-center">
                    <${IconComponent} size="20" class="mr-4 ${isActive ? 'text-teal-400' : 'text-teal-400/50 group-hover:text-teal-300'}" />
                    <span class="text-[11px] font-black uppercase tracking-widest">${label}</span>
                </div>
                ${badge > 0 && html`<span class="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg">${badge}</span>`}
            </button>
        `;
    };

    return html`
        <div class="flex h-screen overflow-hidden bg-slate-50 font-sans">
            <!-- Mobile Header & Overlay -->
            <div class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-brand-900 z-40 flex items-center justify-between px-4 shadow-md">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
                        <div class="w-2 h-2 bg-brand-900 rounded-full animate-pulse"></div>
                    </div>
                    <span class="text-white font-black text-lg tracking-tight italic">XISOBOT PRO</span>
                </div>
                <button onClick=${() => setSidebarOpen(!sidebarOpen)} class="text-white p-2">
                    <${sidebarOpen ? Lucide.X : Lucide.Menu} size="24" />
                </button>
            </div>
            
            ${sidebarOpen && html`
                <div onClick=${() => setSidebarOpen(false)} class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm animate-fade-in"></div>
            `}

            <!-- Sidebar -->
            <aside class="${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative w-[280px] lg:w-80 h-full bg-brand-800 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out">
                <div class="hidden lg:flex p-10 border-b border-brand-900/20">
                    <h1 class="font-black text-2xl text-white tracking-tighter flex items-center italic">
                        <div class="w-10 h-10 bg-brand-500 rounded-2xl mr-3 flex items-center justify-center shadow-lg shadow-brand-500/20 rotate-3">
                            <div class="w-2.5 h-2.5 bg-brand-900 rounded-full animate-pulse"></div>
                        </div>
                        XISOBOT PRO
                    </h1>
                </div>
                
                <div class="lg:hidden h-16 flex items-center px-6 border-b border-brand-900/20">
                    <p class="text-xs text-brand-200 font-bold uppercase tracking-widest">Menyu</p>
                </div>

                <nav class="p-4 lg:p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <${NavItem} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavItem} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <${NavItem} id="trash" icon="Trash2" label="Savat" badge=${deletedTasks.length} />
                </nav>
                <div class="p-6 lg:p-10 border-t border-brand-900/20">
                    <p class="text-[9px] font-black text-brand-500 uppercase tracking-[0.3em] mb-1">Muallif</p>
                    <p class="text-xs font-bold text-white tracking-tight">by Zikrulloh</p>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 overflow-hidden relative pt-16 lg:pt-0">
                <div class="h-full overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
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

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(html`
        <${TaskProvider}>
            <${AppContent} />
        <//>
    `);
}
