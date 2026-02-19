
import React, { useState, useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskProvider, TaskContext } from './store.js';
import { Dashboard, TasksPage, TrashPage, HelpPage } from './views.js';
import { LoginScreen, UserProfile } from './ui.js';
import { SearchModal } from './search.js';

const html = htm.bind(React.createElement);

// --- Theme Toggle Component ---
const ThemeToggle = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        if (theme === 'system') {
            localStorage.removeItem('theme');
        } else {
            localStorage.setItem('theme', theme);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return html`
        <button onClick=${toggleTheme} 
            class="flex items-center justify-between w-full px-6 py-4 mt-2 text-slate-300 hover:bg-brand-800/50 hover:text-white rounded-2xl transition-all duration-300 group"
            aria-label="Rejimni o'zgartirish">
            <div class="flex items-center">
                <${theme === 'dark' ? Lucide.Moon : Lucide.Sun} size="20" class="mr-4 text-teal-400/50 group-hover:text-teal-400" />
                <span class="text-[11px] font-black uppercase tracking-widest">${theme === 'dark' ? 'Tungi rejim' : 'Kunduzgi rejim'}</span>
            </div>
            <div class="w-8 h-4 bg-brand-900 rounded-full relative border border-white/10">
                <div class="absolute top-0.5 left-0.5 w-3 h-3 bg-teal-400 rounded-full transition-transform duration-300 ${theme === 'dark' ? 'translate-x-4' : ''}"></div>
            </div>
        </button>
    `;
};

const AppContent = () => {
    const [view, setView] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { loading, user, login, logout, deletedTasks = [] } = useContext(TaskContext);

    // Initial Loading State optimized for LCP
    if (loading) return html`
        <div class="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-4 text-center">
            <div class="animate-spin text-brand-800 dark:text-brand-500 mb-4"><${Lucide.Loader2} size="48" /><//>
        </div>
    `;

    if (!user) return html`<${LoginScreen} onLogin=${login} />`;

    const NavItem = ({ id, icon, label, badge }) => {
        const IconComponent = Lucide[icon] || Lucide.HelpCircle;
        const isActive = view === id;
        return html`
            <button onClick=${() => { setView(id); setSidebarOpen(false); }} 
                    aria-label="${label} bo'limiga o'tish"
                    class="w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group mb-2
                    ${isActive ? 'bg-brand-900 text-white shadow-2xl' : 'text-slate-300 hover:bg-brand-800/50 hover:text-white'}">
                <div class="flex items-center">
                    <${IconComponent} size="20" class="mr-4 ${isActive ? 'text-teal-400' : 'text-teal-400/50'}" />
                    <span class="text-[11px] font-black uppercase tracking-widest">${label}</span>
                </div>
                ${badge > 0 && html`<span class="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg" aria-label="${badge} ta o'chirilgan vazifa">${badge}</span>`}
            </button>
        `;
    };

    return html`
        <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
            <!-- Mobile Header -->
            <div class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-brand-900 z-40 flex items-center justify-between px-4 shadow-md">
                <span class="text-white font-black text-lg italic tracking-tight">XISOBOT PRO</span>
                <button onClick=${() => setSidebarOpen(!sidebarOpen)} class="text-white p-2" aria-label="Menyuni ochish yoki yopish"><${sidebarOpen ? Lucide.X : Lucide.Menu} size="24" /></button>
            </div>
            
            ${sidebarOpen && html`<div onClick=${() => setSidebarOpen(false)} class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"></div>`}

            <aside class="${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative w-80 h-full bg-brand-800 flex flex-col shadow-2xl z-50 transition-transform duration-300">
                <div class="p-10 border-b border-white/5 hidden lg:flex">
                    <h1 class="font-black text-2xl text-white tracking-tighter flex items-center italic">XISOBOT PRO</h1>
                </div>
                <nav class="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col" aria-label="Asosiy navigatsiya">
                    <${UserProfile} user=${user} onLogout=${logout} />
                    <${NavItem} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavItem} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <${NavItem} id="trash" icon="Trash2" label="Savat" badge=${deletedTasks.length} />
                    <div class="mt-8 mb-4 px-6"><hr class="border-white/5" /></div>
                    <${NavItem} id="help" icon="HelpCircle" label="Yordam" />
                    
                    <!-- Search Hint -->
                    <div class="mt-4 px-6 text-center lg:text-left">
                         <div onClick=${() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', ctrlKey: true}))} class="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-900/50 border border-brand-500/30 text-teal-200/50 hover:text-teal-200 hover:border-brand-500/50 transition-all group">
                            <${Lucide.Search} size="12" />
                            <span class="text-[9px] font-black uppercase tracking-widest">Qidirish <span class="hidden xl:inline group-hover:text-white bg-brand-900 px-1 rounded ml-1">Ctrl+K</span></span>
                         </div>
                    </div>

                    <div class="mt-auto pt-4">
                        <${ThemeToggle} />
                    </div>
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
            
            <!-- Global Search Modal -->
            <${SearchModal} onNavigate=${setView} />
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${TaskProvider}><${AppContent} /><//>`);
