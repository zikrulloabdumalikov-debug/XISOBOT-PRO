
import React, { useState, useContext, useMemo, useEffect } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { parseISO, isBefore, startOfDay } from 'date-fns';
import { TaskContext } from './store.js';
import { Modal, TaskForm } from './ui.js';
import { exportToExcel, getTaskMeta } from './utils.js';
import { TableRowSkeleton } from './components/skeletons.js';

const html = htm.bind(React.createElement);

// --- Session & Local Storage Hooks ---
function useSessionState(key, defaultValue) {
    const [state, setState] = useState(() => {
        try {
            const stored = sessionStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) { return defaultValue; }
    });
    useEffect(() => { sessionStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
    return [state, setState];
}

function useLocalState(key, defaultValue) {
    const [state, setState] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) { return defaultValue; }
    });
    useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
    return [state, setState];
}

// --- Column Settings Component ---
const ColumnSettings = ({ allColumns, hiddenColumns, setHiddenColumns, onClose }) => {
    const toggleCol = (key) => {
        if (hiddenColumns.includes(key)) {
            setHiddenColumns(hiddenColumns.filter(k => k !== key));
        } else {
            setHiddenColumns([...hiddenColumns, key]);
        }
    };
    return html`
        <div class="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[70] p-3 animate-in fade-in zoom-in-95" onClick=${e => e.stopPropagation()}>
            <h4 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2 px-1">Ustunlarni boshqarish</h4>
            <div class="space-y-1">
                ${allColumns.map(col => html`
                    <div key=${col.key} class="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer" onClick=${() => toggleCol(col.key)}>
                        <span class="text-xs font-medium text-slate-600 dark:text-slate-300">${col.label}</span>
                        <div class="w-8 h-4 bg-slate-200 dark:bg-slate-600 rounded-full relative transition-colors ${!hiddenColumns.includes(col.key) ? 'bg-teal-600' : ''}">
                            <div class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${!hiddenColumns.includes(col.key) ? 'translate-x-4' : ''}"></div>
                        </div>
                    </div>
                `)}
            </div>
            <button onClick=${onClose} class="w-full mt-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">Yopish</button>
        </div>
    `;
};

// --- FILTER DROPDOWN COMPONENT ---
const FilterDropdown = ({ columnKey, tasks, activeFilters, onFilterChange, onClose }) => {
    const [search, setSearch] = useState('');
    const uniqueValues = useMemo(() => { const values = new Set(); tasks.forEach(t => { const val = t[columnKey]; values.add(val === undefined || val === null || val === '' ? "(Bo'sh)" : String(val)); }); return Array.from(values).sort(); }, [tasks, columnKey]);
    const filteredValues = uniqueValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    const selected = activeFilters[columnKey] || [];
    const handleCheckboxChange = (value) => { let newSelected; if (selected.includes(value)) { newSelected = selected.filter(v => v !== value); } else { newSelected = [...selected, value]; } onFilterChange(columnKey, newSelected.length === 0 ? null : newSelected); };
    return html`
        <div class="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[60] animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden font-sans" onClick=${e => e.stopPropagation()}>
            <div class="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"><input type="text" placeholder="Qidirish..." value=${search} onChange=${e => setSearch(e.target.value)} autoFocus class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all dark:text-white" /></div>
            <div class="max-h-60 overflow-y-auto custom-scrollbar p-1">
                <div class="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer flex items-center gap-2" onClick=${() => onFilterChange(columnKey, selected.length === uniqueValues.length ? null : uniqueValues)}><input type="checkbox" checked=${!activeFilters[columnKey] || activeFilters[columnKey].length === uniqueValues.length} readOnly class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" /><span class="text-xs font-bold text-slate-700 dark:text-slate-300">(Hammasini tanlash)</span></div>
                ${filteredValues.map(val => html`<div key=${val} class="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer flex items-center gap-2" onClick=${() => handleCheckboxChange(val)}><input type="checkbox" checked=${!activeFilters[columnKey] || selected.includes(val)} readOnly class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" /><span class="text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title=${val}>${val}</span></div>`)}
            </div>
            <div class="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between"><button onClick=${() => onFilterChange(columnKey, null)} class="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">Tozalash</button><button onClick=${onClose} class="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-brand-600 active:scale-95 transition-all">Yopish</button></div>
        </div>
    `;
};

// --- TASKS PAGE COMPONENT ---
export const TasksPage = () => {
    // Added 'highlightedTaskId' and 'setHighlightedTaskId' from context
    const { tasks = [], addTask, deleteTask, updateTask, loading, highlightedTaskId, setHighlightedTaskId } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [modalTask, setModalTask] = useState(null);
    const [editCell, setEditCell] = useState({ id: null, field: null });
    const [cellValue, setCellValue] = useState('');
    const [taskToDelete, setTaskToDelete] = useState(null); 
    
    // State Persistence
    const [sort, setSort] = useSessionState('tasks_sort', { key: 'overdue', dir: 'desc' });
    const [filters, setFilters] = useSessionState('tasks_filters', { status: ['Rejada', 'Jarayonda'] }); 
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [hiddenColumns, setHiddenColumns] = useLocalState('tasks_hidden_cols', []);
    const [showColSettings, setShowColSettings] = useState(false);

    // --- EFFECT: Highlight Search Result ---
    useEffect(() => {
        if (highlightedTaskId) {
            // 1. Ensure task is visible (clear status filter if needed)
            // Ideally check if task is filtered out, but clearing filters is safer
            setFilters({}); 
            
            // 2. Wait for render then scroll
            setTimeout(() => {
                const el = document.getElementById(`task-row-${highlightedTaskId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('flash-highlight');
                    
                    // Remove class and id after animation
                    setTimeout(() => {
                        el.classList.remove('flash-highlight');
                        setHighlightedTaskId(null);
                    }, 2000);
                }
            }, 100);
        }
    }, [highlightedTaskId, setHighlightedTaskId, setFilters]);

    const startCellEdit = (task, field) => { setEditCell({ id: task.id, field }); let val = task[field]; setCellValue(val); };
    
    const saveCell = (overrideValue) => { 
        if (editCell.id && editCell.field) { 
            let newValue = overrideValue !== undefined ? overrideValue : cellValue;
            let updates = { [editCell.field]: newValue };

            // Logic: Status <-> Progress Binding
            if (editCell.field === 'status') {
                const currentProgress = tasks.find(t => t.id === editCell.id)?.progress || 0;
                if (newValue === 'Rejada') updates.progress = 0;
                else if (newValue === 'Jarayonda' && (currentProgress === 0 || currentProgress === 100)) updates.progress = 50;
                else if (newValue === 'Bajarildi') updates.progress = 100;
            }
            if (editCell.field === 'progress') {
                // Progress Validation (Int 0-100)
                let valStr = String(newValue).replace(/[^0-9]/g, '');
                let val = valStr === '' ? 0 : parseInt(valStr, 10);
                
                if (isNaN(val)) val = 0;
                if (val < 0) val = 0;
                if (val > 100) val = 100;
                
                newValue = val;
                updates.progress = val;

                const currentStatus = tasks.find(t => t.id === editCell.id)?.status;
                if (val === 0) updates.status = 'Rejada';
                else if (val > 0 && val < 100) updates.status = 'Jarayonda';
                else if (val === 100) updates.status = 'Bajarildi';
            }

            updateTask({ id: editCell.id, ...updates }); 
            setEditCell({ id: null, field: null }); 
            setCellValue(''); 
        } 
    };
    
    const handleFilterChange = (key, values) => {
        setFilters(prev => {
            const next = { ...prev };
            if (!values) delete next[key];
            else next[key] = values;
            return next;
        });
    };

    const handleDeleteConfirm = () => {
        if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
        }
    };

    const processedTasks = useMemo(() => {
        let result = (tasks || []).map(t => ({ 
            ...t, 
            ...getTaskMeta(t.sana, t.dedlayn, t.status),
            _isOverdue: (t.status !== 'Bajarildi' && t.dedlayn && isBefore(parseISO(t.dedlayn), startOfDay(new Date())))
        }));

        Object.keys(filters).forEach(key => { 
            if (filters[key] && filters[key].length > 0) {
                result = result.filter(t => { 
                    const val = t[key] === undefined || t[key] === null || t[key] === '' ? "(Bo'sh)" : String(t[key]); 
                    return filters[key].includes(val); 
                }); 
            }
        });

        result.sort((a, b) => {
            if (a._isOverdue !== b._isOverdue) return a._isOverdue ? -1 : 1;
            const isDoneA = a.status === 'Bajarildi';
            const isDoneB = b.status === 'Bajarildi';
            if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;

            let valA = a[sort.key];
            let valB = b[sort.key];
            
            if (sort.key === 'overdue') {
                 valA = a.dedlayn || '9999-99-99';
                 valB = b.dedlayn || '9999-99-99';
                 return valA < valB ? -1 : 1;
            }

            if (typeof valA === 'string') valA = valA.toLowerCase(); 
            if (typeof valB === 'string') valB = valB.toLowerCase(); 
            
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1; 
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1; 
            return 0; 
        });

        return result;
    }, [tasks, sort, filters]);

    const allColumns = [ 
        { key: 'id', label: 'ID', width: 'w-20' }, 
        { key: 'sana', label: 'Sana', width: 'w-32' }, 
        { key: 'vazifa', label: 'Vazifa', width: 'min-w-[300px]' }, 
        { key: 'tavsif', label: 'Tavsif', width: 'min-w-[250px]' },
        { key: 'izoh', label: 'Izoh', width: 'min-w-[200px]' }, 
        { key: 'status', label: 'Status', width: 'w-32' }, 
        { key: 'prioritet', label: 'Prioritet', width: 'w-36' }, 
        { key: 'dedlayn', label: 'Dedlayn', width: 'w-32' }, 
        { key: 'progress', label: 'Progress', width: 'w-48' } 
    ];

    const visibleColumns = allColumns.filter(c => !hiddenColumns.includes(c.key));

    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in pb-20" onClick=${() => { setActiveFilterCol(null); setShowColSettings(false); }}>
            <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Vazifalar</h2>
                    <p class="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Jami ${tasks.length} ta yozuv (Ko'rsatilmoqda: ${processedTasks.length})
                        ${filters.status && !filters.status.includes('Bajarildi') && html`<span class="ml-2 text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md text-[9px] font-black">ACTIVE ONLY</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-3 w-full md:w-auto items-center">
                     <div class="relative">
                        <button onClick=${(e) => { e.stopPropagation(); setShowColSettings(!showColSettings); }} aria-label="Ustunlarni sozlash" class="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" title="Ustunlarni sozlash">
                            <${Lucide.Settings2} size="18" />
                        </button>
                        ${showColSettings && html`<${ColumnSettings} allColumns=${allColumns} hiddenColumns=${hiddenColumns} setHiddenColumns=${setHiddenColumns} onClose=${() => setShowColSettings(false)} />`}
                    </div>
                    <button onClick=${() => exportToExcel(tasks)} aria-label="Excelga yuklash" class="flex-1 md:flex-none justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"><${Lucide.FileSpreadsheet} size="18" class="mr-2 text-emerald-500" /> Excel</button>
                    <button onClick=${() => { setModalTask(null); setIsForm(true); }} aria-label="Yangi vazifa qo'shish" class="flex-1 md:flex-none justify-center bg-brand-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"><${Lucide.Plus} size="20" class="mr-2" /> Yangi</button>
                </div>
            </header>
            <div class="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col h-[65vh] md:h-[70vh]"><div class="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative"><table class="w-full text-left text-[11px] border-separate border-spacing-0"><thead class="sticky top-0 z-20"><tr class="bg-slate-100 dark:bg-slate-900 shadow-sm z-20">${visibleColumns.map(col => html`<th key=${col.key} class="${col.width} px-4 py-4 border-b border-slate-200 dark:border-slate-700 border-r border-slate-200/60 dark:border-slate-700/60 last:border-r-0 relative group select-none"><div class="flex items-center justify-between gap-2"><div onClick=${() => setSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === 'asc' ? 'desc' : 'asc' }))} class="flex items-center gap-1 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors uppercase font-extrabold tracking-widest text-[10px] text-slate-500 dark:text-slate-400 flex-1" role="button" aria-label="${col.label} bo'yicha saralash">${col.label}<${Lucide.ArrowUpDown} size="12" class="${sort.key === col.key ? 'text-brand-600 dark:text-brand-400 opacity-100' : 'opacity-30 group-hover:opacity-50'}" /></div><button onClick=${(e) => { e.stopPropagation(); setActiveFilterCol(activeFilterCol === col.key ? null : col.key); }} aria-label="${col.label} bo'yicha filtrlash" class="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${filters[col.key] ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'text-slate-300 hover:text-slate-500'} focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"><${Lucide.Filter} size="14" fill=${filters[col.key] ? "currentColor" : "none"} /></button></div>${activeFilterCol === col.key && html`<${FilterDropdown} columnKey=${col.key} tasks=${tasks} activeFilters=${filters} onFilterChange=${handleFilterChange} onClose=${() => setActiveFilterCol(null)} />`}</th>`)}<th class="w-24 px-4 py-4 bg-slate-100 dark:bg-slate-900 text-right border-b border-slate-200 dark:border-slate-700 border-l border-slate-200/60 dark:border-slate-700/60 uppercase font-extrabold tracking-widest text-slate-400 dark:text-slate-500 text-[10px] sticky right-0 z-30 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)]">Amallar</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            ${loading ? Array(8).fill(0).map((_, i) => html`<${TableRowSkeleton} key=${i} />`) : processedTasks.map(t => html`<tr id="task-row-${t.id}" key=${t.id} class="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 ${t._isOverdue ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}">
                ${!hiddenColumns.includes('id') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top"><div class="font-mono text-slate-300 dark:text-slate-600 text-[10px] select-none py-2">${t.id}</div></td>`}
                ${!hiddenColumns.includes('sana') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'sana')}>${editCell.id === t.id && editCell.field === 'sana' ? html`<input type="date" value=${cellValue} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs" />` : html`<span class="font-bold text-slate-600 dark:text-slate-300 block py-1.5 cursor-pointer">${t.sana}</span>`}</td>`}
                ${!hiddenColumns.includes('vazifa') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'vazifa')}>${editCell.id === t.id && editCell.field === 'vazifa' ? html`<textarea rows="2" value=${cellValue} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-800 font-bold text-xs"></textarea>` : html`<p class="font-extrabold text-slate-800 dark:text-white text-[12px] whitespace-normal break-words py-0.5 ${t._isOverdue ? 'text-red-700 dark:text-red-400' : ''}">${t.vazifa}</p>`}</td>`}
                ${!hiddenColumns.includes('tavsif') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'tavsif')}>${editCell.id === t.id && editCell.field === 'tavsif' ? html`<textarea rows="3" value=${cellValue || ''} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-600 font-medium text-xs"></textarea>` : html`<p class="text-slate-500 dark:text-slate-400 text-[11px] whitespace-normal break-words py-0.5">${t.tavsif || '-'}</p>`}</td>`}
                ${!hiddenColumns.includes('izoh') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'izoh')}>${editCell.id === t.id && editCell.field === 'izoh' ? html`<textarea rows="2" value=${cellValue || ''} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-600 font-medium text-xs"></textarea>` : html`<p class="text-slate-500 dark:text-slate-400 text-[11px] whitespace-normal break-words py-0.5 italic">${t.izoh || '-'}</p>`}</td>`}
                ${!hiddenColumns.includes('status') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'status')}>${editCell.id === t.id && editCell.field === 'status' ? html`<select value=${cellValue} onChange=${e => saveCell(e.target.value)} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-bold"><option value="Rejada">Rejada</option><option value="Jarayonda">Jarayonda</option><option value="Bajarildi">Bajarildi</option></select>` : html`<span class="px-2.5 py-1 rounded-lg font-black uppercase text-[9px] block w-fit mt-1 ${t.status === 'Bajarildi' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}">${t.status}</span>`}</td>`}
                ${!hiddenColumns.includes('prioritet') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'prioritet')}>${editCell.id === t.id && editCell.field === 'prioritet' ? html`<select value=${cellValue} onChange=${e => saveCell(e.target.value)} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-bold"><option value="Juda muhum">🔴 Juda muhum</option><option value="Muhum">🟡 Muhum</option><option value="Muhum emas">🟢 Muhum emas</option></select>` : html`<span class="font-bold flex items-center gap-2 whitespace-nowrap mt-1 ${t.prioritet === 'Juda muhum' ? 'text-red-500' : t.prioritet === 'Muhum' ? 'text-amber-500' : 'text-emerald-500'}"><span class="w-1.5 h-1.5 rounded-full bg-current"></span>${t.prioritet}</span>`}</td>`}
                ${!hiddenColumns.includes('dedlayn') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'dedlayn')}>${editCell.id === t.id && editCell.field === 'dedlayn' ? html`<input type="date" value=${cellValue} onChange=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs" />` : html`<span class="font-bold text-[10px] block py-1.5 ${t._isOverdue ? 'text-red-600 animate-pulse' : 'text-slate-500 dark:text-slate-400'}">${t.dedlayn || '-'} ${t._isOverdue ? '⚠️' : ''}</span>`}</td>`}
                ${!hiddenColumns.includes('progress') && html`<td class="px-4 py-3 border-r border-slate-50 dark:border-slate-700 align-top" onClick=${() => startCellEdit(t, 'progress')}>${editCell.id === t.id && editCell.field === 'progress' ? html`<div class="flex flex-col gap-2"><input type="number" value=${cellValue} onKeyDown=${(e) => { if(['.','e','E','-','+'].includes(e.key)) e.preventDefault(); }} onChange=${e => { let v = e.target.value; if(v > 100) v = 100; if(v < 0) v = 0; if(v.length > 1 && v.startsWith('0')) v = parseInt(v, 10); setCellValue(v); }} onBlur=${() => saveCell()} autoFocus class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs" /><input type="range" min="0" max="100" value=${cellValue || 0} onInput=${e => setCellValue(e.target.value)} onBlur=${() => saveCell()} class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500" /></div>` : html`<div class="flex items-center gap-3 py-1.5"><div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-[50px]"><div class="h-full bg-teal-500 transition-all duration-500" style=${{ width: t.progress + '%' }}></div></div><span class="font-black text-teal-600 dark:text-teal-400 text-[10px]">${t.progress}%</span></div>`}</td>`}
                <td class="px-4 py-3 text-right sticky right-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 transition-all align-top"><div class="flex justify-end gap-1 py-1"><button onClick=${() => { setModalTask(t); setIsForm(true); }} aria-label="Tahrirlash" class="p-2 text-brand-400 hover:text-brand-600 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"><${Lucide.Pencil} size="14" /></button><button onClick=${() => setTaskToDelete(t)} aria-label="O'chirish" class="p-2 text-slate-300 hover:text-red-500 rounded-lg focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"><${Lucide.Trash2} size="14" /></button></div></td></tr>`)}</tbody></table></div></div>
            <${Modal} isOpen=${isForm} onClose=${() => { setIsForm(false); setModalTask(null); }} title=${modalTask ? "Vazifani tahrirlash" : "Yangi vazifa"}><${TaskForm} task=${modalTask} onSubmit=${(d) => { if(modalTask) updateTask(d); else addTask(d); setIsForm(false); setModalTask(null); }} onCancel=${() => { setIsForm(false); setModalTask(null); }} /><//>
            
            <${Modal} isOpen=${!!taskToDelete} onClose=${() => setTaskToDelete(null)} title="O'chirishni tasdiqlang">
                <div class="text-center py-6">
                    <div class="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <${Lucide.Trash2} size="32" />
                    </div>
                    <h4 class="text-lg font-black text-slate-800 dark:text-white mb-2">Rostdan ham o'chirmoqchimisiz?</h4>
                    <p class="text-sm text-slate-400 dark:text-slate-500 font-bold mb-8">
                        Vazifa savatga ko'chiriladi. Uni keyinroq tiklashingiz mumkin.
                    </p>
                    <div class="flex gap-4">
                        <button onClick=${() => setTaskToDelete(null)} class="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest text-xs focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none">Bekor qilish</button>
                        <button onClick=${handleDeleteConfirm} class="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-xl shadow-red-500/20 uppercase tracking-widest text-xs focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none">Ha, savatga</button>
                    </div>
                </div>
            <//>
        </div>
    `;
};
