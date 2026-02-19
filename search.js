
import React, { useState, useEffect, useContext, useRef } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { TaskContext } from './store.js';

const html = htm.bind(React.createElement);

export const SearchModal = ({ onNavigate }) => {
    const { tasks, setHighlightedTaskId } = useContext(TaskContext);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    // Keyboard Shortcut Handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Small timeout to ensure DOM is ready
            setTimeout(() => inputRef.current.focus(), 50);
        } else {
            setQuery(''); // Clear query on close
        }
    }, [isOpen]);

    const handleSelect = (taskId) => {
        setHighlightedTaskId(taskId);
        onNavigate('tasks'); // Switch view to tasks
        setIsOpen(false);
    };

    // Filter Logic
    const filteredTasks = query.length >= 2 
        ? tasks.filter(t => {
            const q = query.toLowerCase();
            return (
                t.vazifa?.toLowerCase().includes(q) ||
                t.tavsif?.toLowerCase().includes(q) ||
                t.izoh?.toLowerCase().includes(q) ||
                t.status?.toLowerCase().includes(q)
            );
        }).slice(0, 5) // Limit to top 5 results
        : [];

    if (!isOpen) return null;

    return html`
        <div class="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4 animate-in fade-in duration-200">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick=${() => setIsOpen(false)}></div>

            <!-- Modal Content -->
            <div class="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative z-[101] flex flex-col max-h-[60vh] animate-in zoom-in-95 slide-in-from-top-4 duration-200">
                
                <!-- Input Section -->
                <div class="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-700">
                    <${Lucide.Search} size="20" class="text-slate-400 mr-3" />
                    <input 
                        ref=${inputRef}
                        type="text" 
                        value=${query}
                        onChange=${(e) => setQuery(e.target.value)}
                        placeholder="Vazifalarni qidirish..." 
                        class="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder-slate-400 text-sm font-medium h-6"
                    />
                    <div class="hidden md:flex items-center gap-1">
                        <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">ESC</kbd>
                    </div>
                </div>

                <!-- Results Section -->
                <div class="overflow-y-auto custom-scrollbar">
                    ${query.length < 2 && html`
                        <div class="p-8 text-center text-slate-400 dark:text-slate-500">
                            <p class="text-xs font-bold uppercase tracking-widest mb-1">Qidirishni boshlang</p>
                            <p class="text-[10px]">Kamida 2 ta harf kiriting</p>
                        </div>
                    `}

                    ${query.length >= 2 && filteredTasks.length === 0 && html`
                        <div class="p-8 text-center text-slate-400 dark:text-slate-500">
                            <${Lucide.Ghost} size="32" class="mx-auto mb-3 opacity-50" />
                            <p class="text-xs font-bold uppercase tracking-widest">Natija topilmadi</p>
                        </div>
                    `}

                    ${query.length >= 2 && filteredTasks.length > 0 && html`
                        <div class="p-2 space-y-1">
                            <p class="px-2 py-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Natijalar</p>
                            ${filteredTasks.map(task => html`
                                <button 
                                    key=${task.id}
                                    onClick=${() => handleSelect(task.id)}
                                    class="w-full text-left px-3 py-3 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/20 group transition-all flex items-center gap-3 border border-transparent hover:border-brand-100 dark:hover:border-brand-800/50"
                                >
                                    <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:text-brand-600 transition-colors shrink-0">
                                        <${Lucide.CheckSquare} size="16" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between mb-0.5">
                                            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-brand-700 dark:group-hover:text-brand-400">${task.vazifa}</h4>
                                            <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ml-2 whitespace-nowrap">${task.status}</span>
                                        </div>
                                        <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                            ${task.tavsif || "Tavsif yo'q"}
                                        </p>
                                    </div>
                                    <${Lucide.ArrowRight} size="14" class="text-slate-300 group-hover:text-brand-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </button>
                            `)}
                        </div>
                    `}
                </div>
                
                <!-- Footer -->
                <div class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span class="text-[9px] text-slate-400 font-bold">Search PRO</span>
                    <span class="text-[9px] text-slate-400 font-bold">${filteredTasks.length} ta topildi</span>
                </div>
            </div>
        </div>
    `;
};
