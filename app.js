import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { 
    format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, startOfDay, 
    endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, 
    subYears, startOfQuarter, endOfQuarter, setMonth 
} from 'date-fns';
import * as idb from 'idb-keyval';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const html = htm.bind(React.createElement);
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // O'zingiznikini qo'ying!
const DRIVE_FILE_NAME = 'xisobot_pro_full_v3.json';

// --- Utils ---
const generateTaskId = (tasks) => {
    const maxId = tasks.reduce((max, t) => Math.max(max, parseInt(t.id) || 0), 0);
    return (maxId + 1).toString().padStart(6, '0');
};

const getWeekRange = (date) => ({
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 })
});

const getPresetRange = (type) => {
    const now = new Date();
    switch (type) {
        case 'today': return { start: startOfDay(now), end: endOfDay(now) };
        case 'yesterday': return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
        case 'thisWeek': return getWeekRange(now);
        case 'prevWeek': return getWeekRange(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1));
        case 'thisMonth': return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'prevMonth': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
        case 'thisYear': return { start: startOfOfYear(now), end: endOfYear(now) };
        default: return getWeekRange(now);
    }
};

// --- Context ---
const TaskContext = createContext();

const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [deletedTasks, setDeletedTasks] = useState([]);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);
    const driveFileId = useRef(null);

    useEffect(() => {
        const init = async () => {
            const [t, d, a] = await Promise.all([idb.get('tasks'), idb.get('trash'), idb.get('auth')]);
            if (t) setTasks(t);
            if (d) setDeletedTasks(d);
            if (a) { setUser(a.user); setToken(a.token); }
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => { if (!loading) { idb.set('tasks', tasks); idb.set('trash', deletedTasks); } }, [tasks, deletedTasks, loading]);

    const sync = useCallback(async (currentTasks, currentTrash, currentToken) => {
        if (!currentToken || syncing) return;
        setSyncing(true);
        try {
            if (!driveFileId.current) {
                const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}'&spaces=appDataFolder`, {
                    headers: { Authorization: `Bearer ${currentToken}` }
                });
                const data = await res.json();
                if (data.files && data.files.length > 0) {
                    driveFileId.current = data.files[0].id;
                    const dl = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId.current}?alt=media`, {
                        headers: { Authorization: `Bearer ${currentToken}` }
                    });
                    const cloud = await dl.json();
                    if (cloud.tasks) { setTasks(cloud.tasks); setDeletedTasks(cloud.trash || []); }
                }
            }
            const metadata = { name: DRIVE_FILE_NAME, parents: driveFileId.current ? undefined : ['appDataFolder'] };
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', new Blob([JSON.stringify({ tasks: currentTasks, trash: currentTrash, date: new Date() })], { type: 'application/json' }));
            await fetch(driveFileId.current ? `https://www.googleapis.com/upload/drive/v3/files/${driveFileId.current}?uploadType=multipart` : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
                method: driveFileId.current ? 'PATCH' : 'POST',
                headers: { Authorization: `Bearer ${currentToken}` },
                body: formData
            });
        } catch (e) { console.error("Sync error", e); }
        setSyncing(false);
    }, [syncing]);

    useEffect(() => {
        const t = setTimeout(() => { if (token) sync(tasks, deletedTasks, token); }, 5000);
        return () => clearTimeout(t);
    }, [tasks, deletedTasks, token, sync]);

    const login = () => {
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.appdata profile email',
            callback: async (res) => {
                if (res.access_token) {
                    setToken(res.access_token);
                    const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${res.access_token}` } });
                    const u = await uRes.json();
                    setUser(u); idb.set('auth', { user: u, token: res.access_token });
                }
            }
        });
        client.requestAccessToken();
    };

    return html`
        <${TaskContext.Provider} value=${{ 
            tasks, deletedTasks, user, syncing, login, loading,
            logout: () => { setUser(null); setToken(null); idb.del('auth'); },
            addTask: (d) => setTasks([{ ...d, id: generateTaskId([...tasks, ...deletedTasks]) }, ...tasks]),
            updateTask: (updated) => setTasks(tasks.map(t => t.id === updated.id ? updated : t)),
            deleteTask: (id) => { 
                const t = tasks.find(x => x.id === id); 
                if(t) { setDeletedTasks([t, ...deletedTasks]); setTasks(tasks.filter(x => x.id !== id)); } 
            },
            restoreTask: (id) => {
                const t = deletedTasks.find(x => x.id === id);
                if(t) { setTasks([t, ...tasks]); setDeletedTasks(deletedTasks.filter(x => x.id !== id)); }
            },
            clearTrash: () => setDeletedTasks([])
        }}>
            ${children}
        <//>
    `;
};

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return html`
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div class="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 class="font-bold text-slate-800">${title}</h3>
                    <button onClick=${onClose} class="text-slate-400 hover:text-slate-600"><${Lucide.X} size="20" /><//>
                </div>
                <div class="p-6 overflow-y-auto custom-scrollbar">${children}</div>
            </div>
        </div>
    `;
};

const TaskForm = ({ task, onSubmit, onCancel }) => {
    const [data, setData] = useState(task || { vazifa: '', tavsif: '', status: 'Rejada', prioritet: 'Muhum', progress: 0, date: format(new Date(), 'yyyy-MM-dd'), dedlayn: '' });
    
    return html`
        <form onSubmit=${(e) => { e.preventDefault(); onSubmit(data); }} class="space-y-4">
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase">Vazifa nomi</label>
                <input required value=${data.vazifa} onChange=${e => setData({...data, vazifa: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-xl mt-1" />
            </div>
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase">Tavsif</label>
                <textarea value=${data.tavsif} onChange=${e => setData({...data, tavsif: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-xl mt-1" rows="3"><//>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select value=${data.status} onChange=${e => setData({...data, status: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-xl mt-1">
                        <option>Rejada</option><option>Jarayonda</option><option>Bajarildi</option>
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Prioritet</label>
                    <select value=${data.prioritet} onChange=${e => setData({...data, prioritet: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-xl mt-1">
                        <option>Juda muhum</option><option>Muhum</option><option>Muhum emas</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Sana</label>
                    <input type="date" value=${data.date} onChange=${e => setData({...data, date: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-xl mt-1" />
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Progress (%)</label>
                    <input type="number" min="0" max="100" value=${data.progress} onChange=${e => setData({...data, progress: parseInt(e.target.value)})} class="w-full p-3 bg-slate-50 border rounded-xl mt-1" />
                </div>
            </div>
            <div class="flex gap-3 pt-4 border-t">
                <button type="button" onClick=${onCancel} class="flex-1 py-3 border rounded-xl font-bold">Bekor qilish</button>
                <button type="submit" class="flex-1 py-3 bg-teal-700 text-white rounded-xl font-bold shadow-lg">Saqlash</button>
            </div>
        </form>
    `;
};

const Dashboard = () => {
    const { tasks, updateTask } = useContext(TaskContext);
    const [range, setRange] = useState({ ...getWeekRange(new Date()), preset: 'thisWeek' });
    const dashboardRef = useRef(null);

    const filtered = tasks.filter(t => isWithinInterval(parseISO(t.date), { start: range.start, end: range.end }));
    
    const exportImage = async (format) => {
        if (!dashboardRef.current) return;
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc' });
        if (format === 'png') {
            const link = document.createElement('a');
            link.download = `hisobot_${range.preset}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } else {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
            pdf.save(`hisobot_${range.preset}.pdf`);
        }
    };

    return html`
        <div class="space-y-6 animate-in fade-in duration-500">
            <header class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Haftalik Monitoring</h2>
                    <p class="text-slate-500 text-sm">${format(range.start, 'dd MMM')} - ${format(range.end, 'dd MMM yyyy')}</p>
                </div>
                <div class="flex gap-2">
                    <button onClick=${() => exportImage('png')} class="bg-white border p-2 rounded-xl shadow-sm text-teal-600"><${Lucide.Image} size="20" /><//>
                    <button onClick=${() => exportImage('pdf')} class="bg-white border p-2 rounded-xl shadow-sm text-red-600"><${Lucide.FileText} size="20" /><//>
                </div>
            </header>

            <div class="bg-white p-4 rounded-2xl border flex flex-wrap gap-2">
                ${['today', 'yesterday', 'thisWeek', 'prevWeek', 'thisMonth'].map(p => html`
                    <button onClick=${() => setRange({...getPresetRange(p), preset: p})} 
                            class="px-4 py-2 rounded-xl text-xs font-bold transition ${range.preset === p ? 'bg-teal-700 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}">
                        ${p.toUpperCase()}
                    </button>
                `)}
            </div>

            <div ref=${dashboardRef} class="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(status => {
                    const statusTasks = filtered.filter(t => t.status === status);
                    return html`
                        <div class="bg-slate-100/50 p-4 rounded-2xl border border-dashed border-slate-300 min-h-[500px]">
                            <h3 class="font-black text-slate-400 uppercase text-[10px] tracking-widest mb-4 flex justify-between">
                                ${status} <span class="bg-white px-2 rounded-full border text-slate-800">${statusTasks.length}</span>
                            </h3>
                            <div class="space-y-3">
                                ${statusTasks.map(t => html`
                                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 group cursor-pointer hover:shadow-md transition">
                                        <div class="flex justify-between items-start mb-2">
                                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">${t.prioritet}</span>
                                            <span class="text-[10px] font-black text-teal-600">${t.progress}%</span>
                                        </div>
                                        <h4 class="font-bold text-slate-800 text-sm leading-tight">${t.vazifa}</h4>
                                        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${t.tavsif}</p>
                                        <div class="mt-3 pt-3 border-t flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span class="flex items-center"><${Lucide.Calendar} size="10" class="mr-1" /> ${t.date}</span>
                                            <span class="font-mono">#${t.id}</span>
                                        </div>
                                    </div>
                                `)}
                            </div>
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
};

const TasksPage = () => {
    const { tasks, addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isAdding, setIsAdding] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [search, setSearch] = useState('');

    const filtered = tasks.filter(t => t.vazifa.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search));

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(tasks);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "xisobot_pro_data.xlsx");
    };

    return html`
        <div class="space-y-6">
            <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Vazifalar Ro'yxati</h2>
                    <p class="text-slate-500 text-sm">Jami ${tasks.length} ta yozuv mavjud</p>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <button onClick=${exportExcel} class="flex-1 md:flex-none bg-white border px-4 py-2 rounded-xl shadow-sm flex items-center justify-center font-bold text-sm">
                        <${Lucide.Download} size="18" class="mr-2 text-teal-600" /> Excel
                    </button>
                    <button onClick=${() => setIsAdding(true)} class="flex-1 md:flex-none bg-teal-700 text-white px-4 py-2 rounded-xl shadow-lg flex items-center justify-center font-bold text-sm">
                        <${Lucide.Plus} size="18" class="mr-2" /> Yangi Vazifa
                    </button>
                </div>
            </header>

            <div class="bg-white p-2 rounded-2xl border shadow-sm flex items-center px-4">
                <${Lucide.Search} size="18" class="text-slate-400 mr-3" />
                <input placeholder="ID yoki vazifa bo'yicha qidiruv..." value=${search} onChange=${e => setSearch(e.target.value)} class="w-full py-3 text-sm bg-transparent outline-none" />
            </div>

            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 border-b text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <tr>
                                <th class="px-6 py-4">ID</th>
                                <th class="px-6 py-4">Vazifa / Tavsif</th>
                                <th class="px-6 py-4">Sana</th>
                                <th class="px-6 py-4">Status</th>
                                <th class="px-6 py-4 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${filtered.map(t => html`
                                <tr key=${t.id} class="hover:bg-slate-50 transition">
                                    <td class="px-6 py-4 font-mono text-xs text-slate-400">${t.id}</td>
                                    <td class="px-6 py-4">
                                        <p class="font-bold text-slate-800">${t.vazifa}</p>
                                        <p class="text-[11px] text-slate-500 truncate max-w-xs">${t.tavsif}</p>
                                    </td>
                                    <td class="px-6 py-4 text-slate-500 font-medium">${t.date}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 rounded-full text-[10px] font-bold ${t.status === 'Bajarildi' ? 'bg-green-100 text-green-700' : t.status === 'Jarayonda' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
                                            ${t.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex justify-end gap-2">
                                            <button onClick=${() => setEditingTask(t)} class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><${Lucide.Edit} size="16" /><//>
                                            <button onClick=${() => deleteTask(t.id)} class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><${Lucide.Trash2} size="16" /><//>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            </div>

            <${Modal} isOpen=${isAdding || !!editingTask} onClose=${() => { setIsAdding(false); setEditingTask(null); }} title=${editingTask ? "Vazifani tahrirlash" : "Yangi vazifa"}>
                <${TaskForm} task=${editingTask} onSubmit=${(d) => { editingTask ? updateTask(d) : addTask(d); setIsAdding(false); setEditingTask(null); }} onCancel=${() => { setIsAdding(false); setEditingTask(null); }} />
            <//>
        </div>
    `;
};

const TrashPage = () => {
    const { deletedTasks, restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-6">
            <header class="flex justify-between items-center">
                <div><h2 class="text-2xl font-bold text-slate-800">Savat</h2><p class="text-sm text-slate-500">O'chirilgan vazifalar</p></div>
                <button onClick=${clearTrash} class="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-red-100">
                    <${Lucide.Trash} size="18" class="mr-2" /> Tozalash
                </button>
            </header>
            <div class="bg-white rounded-2xl border shadow-sm">
                ${deletedTasks.length === 0 ? html`<div class="py-20 text-center text-slate-400 italic">Savat bo'sh</div>` : deletedTasks.map(t => html`
                    <div key=${t.id} class="p-4 border-b last:border-0 flex justify-between items-center hover:bg-slate-50 transition">
                        <div>
                            <p class="font-bold text-slate-800">${t.vazifa}</p>
                            <p class="text-xs text-slate-400">ID: ${t.id} | Sana: ${t.date}</p>
                        </div>
                        <button onClick=${() => restoreTask(t.id)} class="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-100 transition">Tiklash</button>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const App = () => {
    const [view, setView] = useState('dashboard');
    const { user, login, logout, syncing, deletedTasks, loading } = useContext(TaskContext);

    if (loading) return html`<div class="h-screen flex items-center justify-center bg-slate-50"><div class="animate-spin text-teal-700"><${Lucide.Loader2} size="48" /><//><//>`;

    return html`
        <div class="flex h-screen bg-slate-50 overflow-hidden">
            <!-- Sidebar -->
            <aside class="hidden md:flex flex-col w-72 bg-teal-800 text-white shadow-2xl z-50">
                <div class="p-8 border-b border-teal-700 flex items-center gap-4">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg"><span class="text-teal-800 font-black text-xl">X</span></div>
                    <h1 class="font-black text-xl tracking-tighter">XISOBOT PRO</h1>
                </div>

                <div class="p-4 border-b border-teal-700">
                    ${user ? html`
                        <div class="flex items-center gap-3 bg-teal-900/50 p-3 rounded-2xl border border-teal-700/50">
                            <img src=${user.picture} class="w-10 h-10 rounded-full border-2 border-teal-500 shadow-md" />
                            <div class="flex-1 overflow-hidden">
                                <p class="text-xs font-bold truncate">${user.name}</p>
                                <p class="text-[9px] font-black uppercase tracking-widest text-teal-400 flex items-center">
                                    ${syncing ? html`<${Lucide.Loader2} size="10" class="animate-spin mr-1" /> Sinxron...` : html`<${Lucide.Cloud} size="10" class="text-green-400 mr-1" /> Bulutda`}
                                </p>
                            </div>
                            <button onClick=${logout} class="text-teal-400 hover:text-white transition"><${Lucide.LogOut} size="16" /><//>
                        </div>
                    ` : html`
                        <button onClick=${login} class="w-full py-3 bg-white text-teal-800 rounded-2xl text-xs font-black shadow-xl hover:scale-[1.02] transition active:scale-95">
                            GOOGLE BULUTGA ULANISH
                        </button>
                    `}
                </div>

                <nav class="flex-1 p-6 space-y-2">
                    <button onClick=${() => setView('dashboard')} class="w-full flex items-center px-4 py-4 rounded-2xl transition ${view === 'dashboard' ? 'bg-teal-900 shadow-inner' : 'hover:bg-teal-700/50 text-teal-100'}">
                        <${Lucide.LayoutDashboard} size="20" class="mr-3" /> <span class="font-bold text-sm">Monitoring</span>
                    </button>
                    <button onClick=${() => setView('tasks')} class="w-full flex items-center px-4 py-4 rounded-2xl transition ${view === 'tasks' ? 'bg-teal-900 shadow-inner' : 'hover:bg-teal-700/50 text-teal-100'}">
                        <${Lucide.ListTodo} size="20" class="mr-3" /> <span class="font-bold text-sm">Vazifalar</span>
                    </button>
                    <div class="pt-6 mt-6 border-t border-teal-700/50">
                        <button onClick=${() => setView('trash')} class="w-full flex items-center justify-between px-4 py-4 rounded-2xl transition ${view === 'trash' ? 'bg-red-900/30' : 'hover:bg-red-900/10 text-teal-100'}">
                            <div class="flex items-center"><${Lucide.Trash2} size="20" class="mr-3" /> <span class="font-bold text-sm">Savat</span></div>
                            ${deletedTasks.length > 0 && html`<span class="bg-red-500 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">${deletedTasks.length}</span>`}
                        </button>
                    </div>
                </nav>

                <div class="p-8 border-t border-teal-700 text-center">
                    <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400 opacity-60">by Zikrulloh</p>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar relative">
                <div class="max-w-6xl mx-auto pb-24">
                    ${view === 'dashboard' && html`<${Dashboard} />`}
                    ${view === 'tasks' && html`<${TasksPage} />`}
                    ${view === 'trash' && html`<${TrashPage} />`}
                </div>
                
                <!-- Mobile Nav (Simple) -->
                <div class="md:hidden fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-slate-200 p-2 rounded-3xl shadow-2xl flex justify-between z-[90]">
                    <button onClick=${() => setView('dashboard')} class="p-4 ${view === 'dashboard' ? 'text-teal-700 bg-teal-50 rounded-2xl' : 'text-slate-400'}"><${Lucide.LayoutDashboard} /><//>
                    <button onClick=${() => setView('tasks')} class="p-4 ${view === 'tasks' ? 'text-teal-700 bg-teal-50 rounded-2xl' : 'text-slate-400'}"><${Lucide.ListTodo} /><//>
                    <button onClick=${() => setView('trash')} class="p-4 ${view === 'trash' ? 'text-red-700 bg-red-50 rounded-2xl' : 'text-slate-400'}"><${Lucide.Trash2} /><//>
                </div>
            </main>
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${TaskProvider}><${App} /><//>`);
