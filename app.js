import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, startOfDay } from 'date-fns';
import { uz } from 'date-fns/locale/uz';
import * as idb from 'idb-keyval';
import * as XLSX from 'xlsx';

const html = htm.bind(React.createElement);
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // O'ZINGIZNING CLIENT ID'INGIZNI QO'YING
const DRIVE_FILE_NAME = 'xisobot_pro_cloud_data.json';

// --- Context & State Management ---
const TaskContext = createContext();

const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [deletedTasks, setDeletedTasks] = useState([]);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);
    const driveFileId = useRef(null);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            const [localTasks, localTrash, localAuth] = await Promise.all([
                idb.get('tasks'), idb.get('trash'), idb.get('auth')
            ]);
            if (localTasks) setTasks(localTasks);
            if (localTrash) setDeletedTasks(localTrash);
            if (localAuth) {
                setUser(localAuth.user);
                setToken(localAuth.token);
            }
            setLoading(false);
        };
        load();
    }, []);

    // Local Persistence
    useEffect(() => { if (!loading) idb.set('tasks', tasks); }, [tasks, loading]);
    useEffect(() => { if (!loading) idb.set('trash', deletedTasks); }, [deletedTasks, loading]);

    // Google Drive Sync
    const syncWithCloud = useCallback(async (currentTasks, currentTrash, currentToken) => {
        if (!currentToken || syncing) return;
        setSyncing(true);
        try {
            // Find or Create File
            if (!driveFileId.current) {
                const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}'&spaces=appDataFolder`, {
                    headers: { Authorization: `Bearer ${currentToken}` }
                });
                const searchData = await searchRes.json();
                if (searchData.files && searchData.files.length > 0) {
                    driveFileId.current = searchData.files[0].id;
                    const download = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId.current}?alt=media`, {
                        headers: { Authorization: `Bearer ${currentToken}` }
                    });
                    const cloudData = await download.json();
                    if (cloudData.tasks) {
                        setTasks(cloudData.tasks);
                        setDeletedTasks(cloudData.trash || []);
                    }
                }
            }

            // Upload
            const metadata = { name: DRIVE_FILE_NAME, parents: driveFileId.current ? undefined : ['appDataFolder'] };
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', new Blob([JSON.stringify({ tasks: currentTasks, trash: currentTrash, updated: new Date() })], { type: 'application/json' }));

            const url = driveFileId.current 
                ? `https://www.googleapis.com/upload/drive/v3/files/${driveFileId.current}?uploadType=multipart`
                : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

            const res = await fetch(url, {
                method: driveFileId.current ? 'PATCH' : 'POST',
                headers: { Authorization: `Bearer ${currentToken}` },
                body: formData
            });
            const resData = await res.json();
            if (resData.id) driveFileId.current = resData.id;

        } catch (e) { console.error("Sync error:", e); }
        finally { setSyncing(false); }
    }, [syncing]);

    // Auto-sync debounced
    useEffect(() => {
        const timer = setTimeout(() => {
            if (token) syncWithCloud(tasks, deletedTasks, token);
        }, 3000);
        return () => clearTimeout(timer);
    }, [tasks, deletedTasks, token, syncWithCloud]);

    const login = () => {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.appdata profile email',
            callback: async (res) => {
                if (res.access_token) {
                    setToken(res.access_token);
                    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${res.access_token}` }
                    });
                    const userData = await userRes.json();
                    const profile = { name: userData.name, email: userData.email, picture: userData.picture };
                    setUser(profile);
                    idb.set('auth', { user: profile, token: res.access_token });
                }
            }
        });
        client.requestAccessToken();
    };

    const logout = () => {
        setUser(null); setToken(null); driveFileId.current = null; idb.del('auth');
    };

    const addTask = (data) => {
        const id = Math.random().toString(36).substr(2, 6).toUpperCase();
        setTasks([{ ...data, id }, ...tasks]);
    };

    const updateTask = (data) => setTasks(tasks.map(t => t.id === data.id ? data : t));

    const deleteTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            setDeletedTasks([task, ...deletedTasks]);
            setTasks(tasks.filter(t => t.id !== id));
        }
    };

    const restoreTask = (id) => {
        const task = deletedTasks.find(t => t.id === id);
        if (task) {
            setTasks([task, ...tasks]);
            setDeletedTasks(deletedTasks.filter(t => t.id !== id));
        }
    };

    return html`
        <${TaskContext.Provider} value=${{ tasks, deletedTasks, user, syncing, login, logout, addTask, updateTask, deleteTask, restoreTask }}>
            ${children}
        <//>
    `;
};

// --- Components ---

const Sidebar = ({ view, setView }) => {
    const { user, login, logout, syncing, deletedTasks } = useContext(TaskContext);
    
    return html`
        <aside class="w-full md:w-64 bg-teal-800 text-white flex flex-col h-screen shadow-2xl">
            <div class="p-6 border-b border-teal-700 flex items-center space-x-3">
                <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span class="text-teal-800 font-black">X</span>
                </div>
                <h1 class="text-lg font-bold tracking-tight">XISOBOT PRO</h1>
            </div>

            <div class="p-4 border-b border-teal-700">
                ${user ? html`
                    <div class="flex items-center space-x-3 bg-teal-900/50 p-2 rounded-xl">
                        <img src=${user.picture} class="w-10 h-10 rounded-full border border-teal-500" />
                        <div class="flex-1 overflow-hidden">
                            <p class="text-xs font-bold truncate">${user.name}</p>
                            <p class="text-[10px] text-teal-300 flex items-center">
                                ${syncing ? html`<${Lucide.Loader2} size="10" class="animate-spin mr-1" /> Sinxron...` : html`<${Lucide.Cloud} size="10" class="text-green-400 mr-1" /> Bulutda`}
                            </p>
                        </div>
                        <button onClick=${logout} class="p-1 hover:text-red-400"><${Lucide.LogOut} size="16" /><//>
                    </div>
                ` : html`
                    <button onClick=${login} class="w-full py-2 bg-white text-teal-800 rounded-lg text-sm font-bold flex items-center justify-center shadow-md">
                        <${Lucide.LogIn} size="16" class="mr-2" /> Google bilan kirish
                    </button>
                `}
            </div>

            <nav class="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                <button onClick=${() => setView('dashboard')} class="w-full flex items-center px-4 py-3 rounded-xl transition ${view === 'dashboard' ? 'bg-teal-900 text-white shadow-inner' : 'hover:bg-teal-700/50 text-teal-100'}">
                    <${Lucide.LayoutDashboard} size="20" class="mr-3" /> Dashboard
                </button>
                <button onClick=${() => setView('tasks')} class="w-full flex items-center px-4 py-3 rounded-xl transition ${view === 'tasks' ? 'bg-teal-900 text-white shadow-inner' : 'hover:bg-teal-700/50 text-teal-100'}">
                    <${Lucide.ListTodo} size="20" class="mr-3" /> Vazifalar
                </button>
                <div class="pt-4 mt-4 border-t border-teal-700/50">
                    <button onClick=${() => setView('trash')} class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${view === 'trash' ? 'bg-red-900/40 text-white shadow-inner' : 'hover:bg-red-900/10 text-teal-100'}">
                        <div class="flex items-center"><${Lucide.Trash2} size="20" class="mr-3" /> Savat</div>
                        ${deletedTasks.length > 0 && html`<span class="bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">${deletedTasks.length}</span>`}
                    </button>
                </div>
            </nav>

            <div class="p-6 text-center">
                <p class="text-[10px] uppercase tracking-widest text-teal-400 font-bold opacity-60">by Zikrulloh</p>
            </div>
        </aside>
    `;
};

const Dashboard = () => {
    const { tasks } = useContext(TaskContext);
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const weeklyTasks = tasks.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    const stats = {
        done: weeklyTasks.filter(t => t.status === 'Bajarildi').length,
        doing: weeklyTasks.filter(t => t.status === 'Jarayonda').length,
        todo: weeklyTasks.filter(t => t.status === 'Rejada').length,
    };

    return html`
        <div class="space-y-6 animate-in fade-in duration-500">
            <header class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Haftalik Hisobot</h2>
                    <p class="text-slate-500 text-sm">${format(weekStart, 'dd MMMM', { locale: uz })} - ${format(weekEnd, 'dd MMMM yyyy', { locale: uz })}</p>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="p-3 bg-green-50 text-green-600 rounded-xl"><${Lucide.CheckCircle2} size="24" /><//>
                    <div><p class="text-sm text-slate-500">Bajarildi</p><p class="text-2xl font-bold">${stats.done}</p></div>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="p-3 bg-amber-50 text-amber-600 rounded-xl"><${Lucide.Clock} size="24" /><//>
                    <div><p class="text-sm text-slate-500">Jarayonda</p><p class="text-2xl font-bold">${stats.doing}</p></div>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="p-3 bg-blue-50 text-blue-600 rounded-xl"><${Lucide.Circle} size="24" /><//>
                    <div><p class="text-sm text-slate-500">Rejada</p><p class="text-2xl font-bold">${stats.todo}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(status => html`
                    <div class="bg-slate-100/50 p-4 rounded-2xl border border-slate-200 min-h-[400px]">
                        <h3 class="font-bold text-slate-700 mb-4 flex justify-between">
                            ${status} 
                            <span class="bg-white px-2 py-0.5 rounded-lg text-xs shadow-sm">${weeklyTasks.filter(t => t.status === status).length}</span>
                        </h3>
                        <div class="space-y-3">
                            ${weeklyTasks.filter(t => t.status === status).map(t => html`
                                <div key=${t.id} class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer group">
                                    <div class="flex justify-between mb-1">
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-teal-600">${t.priority}</span>
                                        ${t.deadline && isBefore(parseISO(t.deadline), startOfDay(new Date())) && html`<span class="text-red-500"><${Lucide.AlertCircle} size="14" /><//>`}
                                    </div>
                                    <h4 class="font-semibold text-slate-800 text-sm mb-1">${t.title}</h4>
                                    <p class="text-xs text-slate-500 line-clamp-2">${t.desc}</p>
                                </div>
                            `)}
                            ${weeklyTasks.filter(t => t.status === status).length === 0 && html`<div class="text-center py-10 text-slate-400 text-xs italic">Vazifalar yo'q</div>`}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const TaskList = () => {
    const { tasks, addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isAdding, setIsAdding] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', desc: '', status: 'Rejada', priority: 'Muhum', date: format(new Date(), 'yyyy-MM-dd') });

    const handleAdd = (e) => {
        e.preventDefault();
        addTask(newTask);
        setIsAdding(false);
        setNewTask({ title: '', desc: '', status: 'Rejada', priority: 'Muhum', date: format(new Date(), 'yyyy-MM-dd') });
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(tasks);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "vazifalar.xlsx");
    };

    return html`
        <div class="space-y-6">
            <header class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-slate-800">Barcha Vazifalar</h2>
                <div class="flex space-x-2">
                    <button onClick=${exportExcel} class="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 flex items-center">
                        <${Lucide.Download} size="18" class="mr-2 text-teal-600" /> Excel
                    </button>
                    <button onClick=${() => setIsAdding(true)} class="bg-teal-700 text-white px-4 py-2 rounded-xl shadow-md hover:bg-teal-800 flex items-center transition">
                        <${Lucide.Plus} size="18" class="mr-2" /> Yangi
                    </button>
                </div>
            </header>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b">
                        <tr>
                            <th class="px-6 py-4">ID</th>
                            <th class="px-6 py-4">Vazifa</th>
                            <th class="px-6 py-4">Sana</th>
                            <th class="px-6 py-4">Status</th>
                            <th class="px-6 py-4">Amallar</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${tasks.map(t => html`
                            <tr key=${t.id} class="hover:bg-slate-50/50 transition">
                                <td class="px-6 py-4 font-mono text-slate-400 text-xs">${t.id}</td>
                                <td class="px-6 py-4">
                                    <p class="font-semibold text-slate-800">${t.title}</p>
                                    <p class="text-xs text-slate-500 truncate max-w-xs">${t.desc}</p>
                                </td>
                                <td class="px-6 py-4 text-slate-500">${t.date}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-lg text-[10px] font-bold ${t.status === 'Bajarildi' ? 'bg-green-100 text-green-700' : t.status === 'Jarayonda' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
                                        ${t.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <button onClick=${() => deleteTask(t.id)} class="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><${Lucide.Trash2} size="16" /><//>
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>

            ${isAdding && html`
                <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200">
                        <h3 class="text-lg font-bold mb-4">Yangi vazifa qo'shish</h3>
                        <form onSubmit=${handleAdd} class="space-y-4">
                            <input required placeholder="Vazifa nomi" value=${newTask.title} onChange=${e => setNewTask({...newTask, title: e.target.value})} class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                            <textarea placeholder="Tavsif" value=${newTask.desc} onChange=${e => setNewTask({...newTask, desc: e.target.value})} class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"><//>
                            <div class="grid grid-cols-2 gap-4">
                                <select value=${newTask.status} onChange=${e => setNewTask({...newTask, status: e.target.value})} class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <option value="Rejada">Rejada</option>
                                    <option value="Jarayonda">Jarayonda</option>
                                    <option value="Bajarildi">Bajarildi</option>
                                </select>
                                <input type="date" value=${newTask.date} onChange=${e => setNewTask({...newTask, date: e.target.value})} class="p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                            </div>
                            <div class="flex space-x-3 pt-4">
                                <button type="button" onClick=${() => setIsAdding(false)} class="flex-1 py-3 border border-slate-200 rounded-xl">Bekor qilish</button>
                                <button type="submit" class="flex-1 py-3 bg-teal-700 text-white font-bold rounded-xl shadow-lg">Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            `}
        </div>
    `;
};

const Trash = () => {
    const { deletedTasks, restoreTask } = useContext(TaskContext);
    return html`
        <div class="space-y-6">
            <header><h2 class="text-2xl font-bold text-slate-800">Savat</h2></header>
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm">
                ${deletedTasks.length === 0 ? html`<div class="py-20 text-center text-slate-400 italic">Savat bo'sh</div>` : html`
                    <div class="divide-y divide-slate-100">
                        ${deletedTasks.map(t => html`
                            <div key=${t.id} class="p-4 flex justify-between items-center">
                                <div><p class="font-bold">${t.title}</p><p class="text-xs text-slate-500">${t.id}</p></div>
                                <button onClick=${() => restoreTask(t.id)} class="flex items-center text-teal-600 font-bold text-sm bg-teal-50 px-4 py-2 rounded-xl">
                                    <${Lucide.RotateCcw} size="16" class="mr-2" /> Tiklash
                                </button>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};

const App = () => {
    const [view, setView] = useState('dashboard');

    return html`
        <${TaskProvider}>
            <div class="flex flex-col md:flex-row min-h-screen bg-slate-50 h-screen overflow-hidden">
                <${Sidebar} view=${view} setView=${setView} />
                <main class="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
                    <div class="max-w-6xl mx-auto pb-20">
                        ${view === 'dashboard' && html`<${Dashboard} />`}
                        ${view === 'tasks' && html`<${TaskList} />`}
                        ${view === 'trash' && html`<${Trash} />`}
                    </div>
                </main>
            </div>
        <//>
    `;
};

ReactDOM.render(html`<${App} />`, document.getElementById('root'));
