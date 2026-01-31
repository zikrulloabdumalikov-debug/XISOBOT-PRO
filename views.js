
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { 
    parseISO, isWithinInterval, isValid, format, 
    startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, parse 
} from 'date-fns';
import { TaskContext } from './store.js';
import { KPICard, Modal, TaskForm } from './ui.js';
import { exportToExcel, getTaskMeta } from './utils.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const html = htm.bind(React.createElement);

export const Dashboard = () => {
    const { tasks = [] } = useContext(TaskContext);
    const [preset, setPreset] = useState('hafta');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    
    const range = useMemo(() => {
        const d = currentDate;
        switch (preset) {
            case 'bugun': 
                return { start: startOfDay(d), end: endOfDay(d), label: format(d, 'dd.MM.yyyy') };
            case 'hafta': 
                return { 
                    start: startOfWeek(d, { weekStartsOn: 1 }), 
                    end: endOfWeek(d, { weekStartsOn: 1 }),
                    label: `${format(startOfWeek(d, { weekStartsOn: 1 }), 'dd.MM')} - ${format(endOfWeek(d, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`
                };
            case 'oy': 
                return { 
                    start: startOfMonth(d), 
                    end: endOfMonth(d),
                    label: format(d, 'MMMM yyyy')
                };
            case 'jami':
                return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31), label: "Barcha davr" };
            default:
                return { start: startOfDay(d), end: endOfDay(d), label: "" };
        }
    }, [preset, currentDate]);

    const handleNavigate = (direction) => {
        if (preset === 'jami') return;
        if (preset === 'bugun') setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
        if (preset === 'hafta') setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
        if (preset === 'oy') setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const handlePresetChange = (p) => {
        setPreset(p);
        setCurrentDate(new Date());
    };

    const filtered = useMemo(() => {
        return (tasks || []).filter(t => {
            if (!t?.sana) return false;
            try { 
                const d = parseISO(t.sana);
                return isValid(d) && isWithinInterval(d, { start: range.start, end: range.end }); 
            }
            catch (e) { return false; }
        });
    }, [tasks, range]);

    const stats = {
        done: filtered.filter(t => t.status === 'Bajarildi').length,
        doing: filtered.filter(t => t.status === 'Jarayonda').length,
        todo: filtered.filter(t => t.status === 'Rejada').length,
        total: filtered.length
    };

    const handleDownload = async (type) => {
        setIsExporting(true);
        // UI o'zgarishini kutish (tugmalar yo'qolishi uchun)
        await new Promise(r => setTimeout(r, 300));

        const element = document.getElementById('dashboard-content');
        if (!element) {
            setIsExporting(false);
            return;
        }

        try {
            const canvas = await html2canvas(element, {
                scale: 3, // Yuqori sifat uchun 3x kattalashtirish
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#f8fafc', // Orqa fonni aniq belgilash (shaffoflik muammosini oldini oladi)
                logging: false,
                width: element.scrollWidth,
                height: element.scrollHeight,
                onclone: (clonedDoc) => {
                    const clonedContent = clonedDoc.getElementById('dashboard-content');
                    // Eksport paytida soyalarni olib tashlash (hiralashishni oldini oladi)
                    if (clonedContent) {
                        clonedContent.style.boxShadow = 'none';
                        // Barcha child elementlardan soyalarni olib tashlash
                        const allElements = clonedContent.querySelectorAll('*');
                        allElements.forEach(el => {
                            el.style.boxShadow = 'none';
                            el.style.animation = 'none'; // Animatsiyalarni to'xtatish
                            el.style.transition = 'none';
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png', 1.0); // 1.0 = Maksimal sifat

            if (type === 'png') {
                const link = document.createElement('a');
                link.download = `xisobot_${preset}_${format(currentDate, 'dd-MM-yyyy')}.png`;
                link.href = imgData;
                link.click();
            } else if (type === 'pdf') {
                // Landscape (yotiq) rejim, A4 qog'oz
                const pdf = new jsPDF('l', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const imgProps = pdf.getImageProperties(imgData);
                const ratio = imgProps.width / imgProps.height;
                
                let imgWidth = pdfWidth;
                let imgHeight = pdfWidth / ratio;

                // Agar balandlik sig'masa, o'lchamni to'g'irlash
                if (imgHeight > pdfHeight) {
                    imgHeight = pdfHeight;
                    imgWidth = pdfHeight * ratio;
                }

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`xisobot_${preset}_${format(currentDate, 'dd-MM-yyyy')}.pdf`);
            }
        } catch (err) {
            console.error("Export error:", err);
            alert("Eksport qilishda xatolik yuz berdi. Sahifani yangilab qayta urinib ko'ring.");
        } finally {
            setIsExporting(false);
        }
    };

    return html`
        <div id="dashboard-content" class="space-y-6 md:space-y-10 animate-fade-in p-1 bg-[#f8fafc]">
            <header class="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                        <p class="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Tizim Faol</p>
                    </div>
                    <h2 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Monitoring</h2>
                </div>
                
                <div class="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center" data-html2canvas-ignore="true">
                    ${!isExporting && html`
                        <div class="flex gap-2 w-full md:w-auto">
                            <button onClick=${() => handleDownload('png')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-wider">
                                <${Lucide.Image} size="16" class="mr-2 text-blue-500" /> PNG
                            </button>
                            <button onClick=${() => handleDownload('pdf')} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-[10px] flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-wider">
                                <${Lucide.FileDown} size="16" class="mr-2 text-red-500" /> PDF
                            </button>
                        </div>
                    `}
                    
                    <div class="flex flex-col md:flex-row bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto shadow-inner">
                        ${preset !== 'jami' && html`
                            <div class="flex items-center justify-between bg-white rounded-xl px-2 py-1 shadow-sm border border-slate-200/50 w-full md:w-auto">
                                <button onClick=${() => handleNavigate('prev')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors active:scale-90">
                                    <${Lucide.ChevronLeft} size="16" strokeWidth="3" />
                                </button>
                                <span class="mx-3 text-xs font-black text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[100px] text-center">
                                    ${range.label}
                                </span>
                                <button onClick=${() => handleNavigate('next')} class="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors active:scale-90">
                                    <${Lucide.ChevronRight} size="16" strokeWidth="3" />
                                </button>
                            </div>
                        `}

                        <div class="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200/50 w-full md:w-auto overflow-x-auto">
                            ${['bugun', 'hafta', 'oy', 'jami'].map(p => html`
                                <button key=${p} onClick=${() => handlePresetChange(p)} 
                                        class="flex-1 md:flex-none px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 ${preset === p ? 'bg-brand-500 text-white shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}">
                                    ${p}
                                </button>
                            `)}
                        </div>
                    </div>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-emerald-500" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Activity" color="text-amber-500" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Compass" color="text-indigo-500" />
                <${KPICard} label="Jami" count=${stats.total} icon="BarChart3" color="text-brand-500" />
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-10">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div key=${s} class="bg-slate-100/50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200/50 min-h-[300px] md:min-h-[500px] flex flex-col">
                        <div class="flex items-center justify-between mb-6 md:mb-8 px-2">
                            <h3 class="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">${s}</h3>
                            <span class="bg-white text-[10px] md:text-[11px] font-black px-3 py-1 rounded-xl border border-slate-200 shadow-sm">${filtered.filter(t => t.status === s).length}</span>
                        </div>
                        <div class="space-y-4 md:space-y-5 flex-1 ${!isExporting ? 'overflow-y-auto custom-scrollbar max-h-[400px] md:max-h-none' : ''} pr-1 md:pr-2">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div key=${t.id} class="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 active:scale-95 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer mb-4">
                                    <h4 class="font-bold text-slate-800 text-sm mb-4 leading-relaxed whitespace-normal break-words">${t.vazifa}</h4>
                                    <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span class="flex items-center"><${Lucide.Calendar} size="12" class="mr-2 opacity-50" /> ${t.sana}</span>
                                        <div class="flex items-center gap-2">
                                            <div class="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div class="h-full bg-brand-500" style=${{ width: t.progress + '%' }}></div>
                                            </div>
                                            <span class="text-brand-500">${t.progress}%</span>
                                        </div>
                                    </div>
                                </div>
                            `)}
                            ${filtered.filter(t => t.status === s).length === 0 && html`
                                <div class="text-center py-10 opacity-30">
                                    <p class="text-[10px] uppercase font-bold tracking-widest">Bo'sh</p>
                                </div>
                            `}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

// Filter Dropdown Component
const FilterDropdown = ({ columnKey, tasks, activeFilters, onFilterChange, onClose }) => {
    const [search, setSearch] = useState('');
    const uniqueValues = useMemo(() => {
        const values = new Set();
        tasks.forEach(t => {
            const val = t[columnKey];
            values.add(val === undefined || val === null || val === '' ? "(Bo'sh)" : String(val));
        });
        return Array.from(values).sort();
    }, [tasks, columnKey]);
    const filteredValues = uniqueValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    const selected = activeFilters[columnKey] || [];
    const handleCheckboxChange = (value) => {
        let newSelected;
        if (selected.includes(value)) { newSelected = selected.filter(v => v !== value); } 
        else { newSelected = [...selected, value]; }
        onFilterChange(columnKey, newSelected.length === 0 ? null : newSelected);
    };
    const handleSelectAll = () => {
        if (selected.length === uniqueValues.length) { onFilterChange(columnKey, null); } 
        else { onFilterChange(columnKey, uniqueValues); }
    };
    const handleClear = () => { onFilterChange(columnKey, null); };

    return html`
        <div class="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-[60] animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden font-sans" onClick=${e => e.stopPropagation()}>
            <div class="p-3 border-b border-slate-100 bg-slate-50/50">
                <input type="text" placeholder="Qidirish..." value=${search} onChange=${e => setSearch(e.target.value)} autoFocus class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all" />
            </div>
            <div class="max-h-60 overflow-y-auto custom-scrollbar p-1">
                <div class="px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-2" onClick=${handleSelectAll}>
                     <input type="checkbox" checked=${!activeFilters[columnKey] || activeFilters[columnKey].length === uniqueValues.length} readOnly class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                     <span class="text-xs font-bold text-slate-700">(Hammasini tanlash)</span>
                </div>
                ${filteredValues.map(val => html`
                    <div key=${val} class="px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-2" onClick=${() => handleCheckboxChange(val)}>
                        <input type="checkbox" checked=${!activeFilters[columnKey] || selected.includes(val)} readOnly class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                        <span class="text-xs font-medium text-slate-600 truncate" title=${val}>${val}</span>
                    </div>
                `)}
                ${filteredValues.length === 0 && html`<div class="p-4 text-center text-xs text-slate-400 font-bold italic">Topilmadi</div>`}
            </div>
            <div class="p-2 border-t border-slate-100 bg-slate-50 flex justify-between">
                 <button onClick=${handleClear} class="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">Tozalash</button>
                 <button onClick=${onClose} class="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-brand-600 active:scale-95 transition-all">Yopish</button>
            </div>
        </div>
    `;
};

export const TasksPage = () => {
    const { tasks = [], addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [modalTask, setModalTask] = useState(null);
    const [editCell, setEditCell] = useState({ id: null, field: null });
    const [cellValue, setCellValue] = useState('');
    const [sort, setSort] = useState({ key: 'id', dir: 'desc' });
    const [filters, setFilters] = useState({}); 
    const [activeFilterCol, setActiveFilterCol] = useState(null);

    const openDetailEdit = (task) => {
        setModalTask(task);
        setIsForm(true);
    };

    const startCellEdit = (task, field) => {
        setEditCell({ id: task.id, field });
        let val = task[field];
        
        // Progress uchun raqam formatlash
        if (field === 'progress') {
            val = parseInt(val) || 0;
        }

        // Sana formati uchun tuzatish (Input date yyyy-MM-dd talab qiladi)
        if (field === 'sana' || field === 'dedlayn') {
            if (val && !val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Agar sana formati boshqacha bo'lsa (masalan DD.MM.YYYY), uni ISO ga o'tkazamiz
                // Oddiy tekshiruv va konvertatsiya
                try {
                     // Agar DD.MM.YYYY bo'lsa
                     if (val.includes('.')) {
                        const parts = val.split('.');
                        if (parts.length === 3) {
                            val = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                     }
                } catch(e) {}
            }
        }
        
        setCellValue(val);
    };

    const handleCellChange = (val) => {
        setCellValue(val);
    };

    const saveCell = (overrideValue) => {
        const valueToSave = overrideValue !== undefined ? overrideValue : cellValue;
        if (editCell.id && editCell.field) {
            updateTask({ id: editCell.id, [editCell.field]: valueToSave });
            setEditCell({ id: null, field: null });
            setCellValue('');
        }
    };

    const handleSort = (key) => {
        setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const handleFilterChange = (key, selectedValues) => {
        setFilters(prev => {
            const next = { ...prev };
            if (!selectedValues || selectedValues.length === 0) {
                delete next[key];
            } else {
                next[key] = selectedValues;
            }
            return next;
        });
    };

    const processedTasks = useMemo(() => {
        let result = (tasks || []).map(t => ({ ...t, ...getTaskMeta(t.sana, t.dedlayn, t.status) }));
        Object.keys(filters).forEach(key => {
            if (filters[key] && filters[key].length > 0) {
                result = result.filter(t => {
                    const val = t[key] === undefined || t[key] === null || t[key] === '' ? "(Bo'sh)" : String(t[key]);
                    return filters[key].includes(val);
                });
            }
        });
        result.sort((a, b) => {
            let valA = a[sort.key];
            let valB = b[sort.key];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [tasks, sort, filters]);

    const columns = [
        { key: 'id', label: 'ID', width: 'w-20' },
        { key: 'sana', label: 'Sana', width: 'w-32' },
        { key: 'vazifa', label: 'Vazifa', width: 'min-w-[300px]' },
        { key: 'izoh', label: 'Izoh', width: 'min-w-[200px]' },
        { key: 'status', label: 'Status', width: 'w-32' },
        { key: 'prioritet', label: 'Prioritet', width: 'w-36' },
        { key: 'dedlayn', label: 'Dedlayn', width: 'w-32' },
        { key: 'progress', label: 'Progress', width: 'w-48' }
    ];

    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in pb-20" onClick=${() => setActiveFilterCol(null)}>
            <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Vazifalar</h2>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Jami ${tasks.length} ta yozuv (Ko'rsatilmoqda: ${processedTasks.length})</p>
                </div>
                <div class="flex flex-wrap gap-3 w-full md:w-auto">
                    <button onClick=${() => exportToExcel(tasks)} class="flex-1 md:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                        <${Lucide.FileSpreadsheet} size="18" class="mr-2 text-emerald-500" /> Excel
                    </button>
                    <button onClick=${() => { setModalTask(null); setIsForm(true); }} class="flex-1 md:flex-none justify-center bg-brand-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs flex items-center hover:bg-slate-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95">
                        <${Lucide.Plus} size="20" class="mr-2" /> Yangi
                    </button>
                </div>
            </header>

            <div class="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[65vh] md:h-[70vh]">
                <div class="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
                    <table class="w-full text-left text-[11px] border-separate border-spacing-0">
                        <thead class="sticky top-0 z-20">
                            <tr class="bg-slate-100 shadow-sm z-20">
                                ${columns.map(col => html`
                                    <th key=${col.key} class="${col.width} px-4 py-4 border-b border-slate-200 border-r border-slate-200/60 last:border-r-0 relative group select-none">
                                        <div class="flex items-center justify-between gap-2">
                                            <div onClick=${() => handleSort(col.key)} class="flex items-center gap-1 cursor-pointer hover:text-brand-600 transition-colors uppercase font-extrabold tracking-widest text-[10px] text-slate-400 flex-1">
                                                ${col.label}
                                                <${Lucide.ArrowUpDown} size="12" class="${sort.key === col.key ? 'text-brand-600 opacity-100' : 'opacity-30 group-hover:opacity-50'}" />
                                            </div>
                                            
                                            <button onClick=${(e) => { e.stopPropagation(); setActiveFilterCol(activeFilterCol === col.key ? null : col.key); }} 
                                                class="p-1 rounded-md hover:bg-slate-200 transition-colors ${filters[col.key] ? 'text-brand-500 bg-brand-50' : 'text-slate-300 hover:text-slate-500'}">
                                                <${Lucide.Filter} size="14" fill=${filters[col.key] ? "currentColor" : "none"} />
                                            </button>
                                        </div>

                                        ${activeFilterCol === col.key && html`
                                            <${FilterDropdown} 
                                                columnKey=${col.key} 
                                                tasks=${tasks} 
                                                activeFilters=${filters}
                                                onFilterChange=${handleFilterChange}
                                                onClose=${() => setActiveFilterCol(null)}
                                            />
                                        `}
                                    </th>
                                `)}
                                <th class="w-24 px-4 py-4 bg-slate-100 text-right border-b border-slate-200 border-l border-slate-200/60 uppercase font-extrabold tracking-widest text-slate-400 text-[10px] sticky right-0 z-30 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)]">
                                    Amallar
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${processedTasks.map(t => {
                                return html`
                                <tr key=${t.id} class="group hover:bg-slate-50 transition-all duration-200">
                                    <td class="px-4 py-3 border-r border-slate-50 align-top">
                                        <div class="font-mono text-slate-300 text-[10px] select-none py-2">${t.id}</div>
                                    </td>

                                    <!-- Sana (Tuzatildi: Kalendar va Format) -->
                                    <td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'sana')}>
                                        ${editCell.id === t.id && editCell.field === 'sana' ? html`
                                            <input type="date" value=${cellValue} 
                                                onChange=${e => handleCellChange(e.target.value)}
                                                onBlur=${() => saveCell()}
                                                onKeyDown=${e => e.key === 'Enter' && saveCell()}
                                                autoFocus
                                                onClick=${(e) => e.target.showPicker && e.target.showPicker()}
                                                class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs shadow-sm focus:ring-2 focus:ring-blue-100 outline-none" />
                                        ` : html`
                                            <span class="font-bold text-slate-600 block py-1.5 cursor-pointer hover:text-blue-500">${t.sana}</span>
                                        `}
                                    </td>

                                    <!-- Vazifa -->
                                    <td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'vazifa')}>
                                        ${editCell.id === t.id && editCell.field === 'vazifa' ? html`
                                            <textarea rows="2" value=${cellValue} 
                                                onChange=${e => handleCellChange(e.target.value)}
                                                onBlur=${() => saveCell()}
                                                onKeyDown=${e => e.key === 'Enter' && !e.shiftKey && saveCell()}
                                                autoFocus
                                                class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-800 font-bold text-xs shadow-sm focus:ring-2 focus:ring-blue-100 outline-none resize-y"></textarea>
                                        ` : html`
                                            <div class="max-w-full cursor-pointer hover:bg-slate-100/50 rounded p-1 -m-1">
                                                <p class="font-extrabold text-slate-800 text-[12px] leading-relaxed whitespace-normal break-words py-0.5">${t.vazifa}</p>
                                            </div>
                                        `}
                                    </td>

                                    <!-- Izoh -->
                                    <td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'izoh')}>
                                        ${editCell.id === t.id && editCell.field === 'izoh' ? html`
                                            <textarea rows="2" value=${cellValue || ''} 
                                                onChange=${e => handleCellChange(e.target.value)}
                                                onBlur=${() => saveCell()}
                                                onKeyDown=${e => e.key === 'Enter' && !e.shiftKey && saveCell()}
                                                autoFocus
                                                placeholder="Izoh..."
                                                class="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-slate-600 font-medium text-xs shadow-sm focus:ring-2 focus:ring-blue-100 outline-none resize-y"></textarea>
                                        ` : html`
                                            <div class="max-w-full cursor-pointer hover:bg-slate-100/50 rounded p-1 -m-1">
                                                <p class="text-slate-500 text-[11px] leading-relaxed whitespace-normal break-words py-0.5 italic">${t.izoh || '-'}</p>
                                            </div>
                                        `}
                                    </td>

                                    <!-- Status -->
                                    <td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'status')}>
                                        ${editCell.id === t.id && editCell.field === 'status' ? html`
                                            <select value=${cellValue} 
                                                onChange=${e => saveCell(e.target.value)}
                                                autoFocus
                                                class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none">
                                                <option value="Rejada">Rejada</option>
                                                <option value="Jarayonda">Jarayonda</option>
                                                <option value="Bajarildi">Bajarildi</option>
                                            </select>
                                        ` : html`
                                            <span class="cursor-pointer px-2.5 py-1 rounded-lg font-black uppercase text-[9px] whitespace-nowrap block w-fit mt-1 hover:opacity-80 ${
                                                t.status === 'Bajarildi' ? 'bg-emerald-50 text-emerald-600' : 
                                                t.status === 'Jarayonda' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                            }">${t.status}</span>
                                        `}
                                    </td>

                                    <!-- Prioritet -->
                                    <td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'prioritet')}>
                                        ${editCell.id === t.id && editCell.field === 'prioritet' ? html`
                                            <select value=${cellValue} 
                                                onChange=${e => saveCell(e.target.value)}
                                                autoFocus
                                                class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none">
                                                <option value="Juda muhum">🔴 Juda muhum</option>
                                                <option value="Muhum">🟡 Muhum</option>
                                                <option value="Muhum emas">🟢 Muhum emas</option>
                                            </select>
                                        ` : html`
                                            <span class="cursor-pointer font-bold flex items-center gap-2 whitespace-nowrap mt-1 hover:opacity-80 ${
                                                t.prioritet === 'Juda muhum' ? 'text-red-500' :
                                                t.prioritet === 'Muhum' ? 'text-amber-500' : 'text-emerald-500'
                                            }">
                                                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                ${t.prioritet}
                                            </span>
                                        `}
                                    </td>

                                    <!-- Dedlayn (Tuzatildi: Kalendar va Format) -->
                                    <td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'dedlayn')}>
                                        ${editCell.id === t.id && editCell.field === 'dedlayn' ? html`
                                            <input type="date" value=${cellValue} 
                                                onChange=${e => handleCellChange(e.target.value)}
                                                onBlur=${() => saveCell()}
                                                onKeyDown=${e => e.key === 'Enter' && saveCell()}
                                                autoFocus
                                                onClick=${(e) => e.target.showPicker && e.target.showPicker()}
                                                class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs shadow-sm focus:ring-2 focus:ring-blue-100 outline-none" />
                                        ` : html`
                                            <span class="cursor-pointer font-bold text-slate-500 text-[10px] block py-1.5 hover:text-blue-500">${t.dedlayn || '-'}</span>
                                        `}
                                    </td>

                                    <!-- Progress (Tuzatildi: Slider logikasi mukammallashtirildi) -->
                                    <td class="px-4 py-3 border-r border-slate-50 align-top" onClick=${() => startCellEdit(t, 'progress')}>
                                        ${editCell.id === t.id && editCell.field === 'progress' ? html`
                                            <div class="flex flex-col gap-2" onClick=${e => e.stopPropagation()}>
                                                <div class="flex items-center gap-2 relative">
                                                    <input type="number" min="0" max="100" value=${cellValue} 
                                                        onChange=${e => handleCellChange(e.target.value)}
                                                        onBlur=${(e) => { 
                                                            if (e.relatedTarget && e.relatedTarget.type === 'range') return;
                                                            saveCell();
                                                        }}
                                                        onKeyDown=${e => e.key === 'Enter' && saveCell()}
                                                        autoFocus
                                                        class="w-full px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-700 font-bold text-xs shadow-sm focus:ring-2 focus:ring-blue-100 outline-none pl-2 pr-6 text-right" />
                                                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-[10px] font-black">%</span>
                                                </div>
                                                <input type="range" min="0" max="100" step="1"
                                                    value=${cellValue || 0}
                                                    onInput=${e => handleCellChange(e.target.value)}
                                                    onBlur=${(e) => { 
                                                            if (e.relatedTarget && e.relatedTarget.type === 'number') return;
                                                            saveCell();
                                                    }}
                                                    class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500" />
                                            </div>
                                        ` : html`
                                            <div class="flex items-center gap-3 py-1.5 cursor-pointer hover:opacity-80">
                                                <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[50px]">
                                                    <div class="h-full bg-brand-500 transition-all duration-500" style=${{ width: t.progress + '%' }}></div>
                                                </div>
                                                <span class="font-black text-brand-500 text-[10px]">${t.progress}%</span>
                                            </div>
                                        `}
                                    </td>

                                    <!-- Actions -->
                                    <td class="px-4 py-3 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-all shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.1)] align-top">
                                        <div class="flex justify-end gap-1 py-1" onClick=${e => e.stopPropagation()}>
                                            <button onClick=${() => openDetailEdit(t)} class="p-2 text-brand-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-90" title="Batafsil tahrirlash">
                                                <${Lucide.Pencil} size="14" />
                                            </button>
                                            <button onClick=${() => deleteTask(t.id)} class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90" title="O'chirish">
                                                <${Lucide.Trash2} size="14" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                `
                            })}
                        </tbody>
                    </table>
                </div>
                ${processedTasks.length === 0 && html`
                    <div class="py-20 flex flex-col items-center justify-center opacity-30 text-center flex-1">
                        <${Lucide.SearchX} size="48" strokeWidth="1" class="mb-4" />
                        <p class="font-bold uppercase tracking-widest text-[10px]">Ma'lumot topilmadi</p>
                    </div>
                `}
            </div>

            <${Modal} isOpen=${isForm} onClose=${() => { setIsForm(false); setModalTask(null); }} title=${modalTask ? "Vazifani tahrirlash" : "Yangi vazifa"}>
                <${TaskForm} 
                    task=${modalTask} 
                    onSubmit=${(d) => { 
                        if (modalTask) {
                            updateTask(d);
                        } else {
                            addTask(d); 
                        }
                        setIsForm(false); 
                        setModalTask(null);
                    }} 
                    onCancel=${() => { setIsForm(false); setModalTask(null); }} 
                />
            <//>
        </div>
    `;
};

export const TrashPage = () => {
    const { deletedTasks = [], restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-6 md:space-y-8 animate-fade-in">
            <header class="flex justify-between items-center">
                <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Savat</h2>
                <button onClick=${clearTrash} class="text-red-500 font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 px-4 md:px-6 py-2 md:py-3 rounded-2xl transition-all active:scale-95">Tozalash</button>
            </header>
            <div class="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                ${(deletedTasks || []).length === 0 ? html`
                    <div class="py-20 md:py-40 flex flex-col items-center justify-center opacity-20 grayscale">
                        <${Lucide.Recycle} size="60" strokeWidth="1" class="mb-6" />
                        <p class="font-bold italic uppercase tracking-widest text-xs">Savat bo'sh</p>
                    </div>
                ` : html`
                    <div class="divide-y divide-slate-50">
                        ${deletedTasks.map(t => html`
                            <div key=${t.id} class="p-6 md:p-8 px-6 md:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-all group">
                                <div class="flex items-center gap-4 md:gap-6">
                                    <div class="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-red-400 transition-all shrink-0">
                                        <${Lucide.FileX} size="20" />
                                    </div>
                                    <div>
                                        <p class="font-bold text-slate-800 text-base md:text-lg group-hover:text-red-600 transition-colors line-clamp-1">${t.vazifa}</p>
                                        <p class="text-[10px] md:text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">${t.status} • ID: ${t.id}</p>
                                    </div>
                                </div>
                                <button onClick=${() => restoreTask(t.id)} class="w-full md:w-auto bg-brand-50 text-brand-700 px-6 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] hover:bg-brand-900 hover:text-white transition-all shadow-sm active:scale-95">Tiklash</button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};
