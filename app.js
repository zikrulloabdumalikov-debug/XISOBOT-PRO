import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, startOfDay } from 'date-fns';
import * as idb from 'idb-keyval';
import * as XLSX from 'xlsx';

const html = htm.bind(React.createElement);
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // O'zingiznikini qo'ying!
const DRIVE_FILE_NAME = 'xisobot_pro_cloud_data_v2.json';

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
        const loadLocal = async () => {
            try {
                const [t, d, a] = await Promise.all([idb.get('tasks'), idb.get('trash'), idb.get('auth')]);
                if (t) setTasks(t);
                if (d) setDeletedTasks(d);
                if (a) { setUser(a.user); setToken(a.token); }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        loadLocal();
    }, []);

    useEffect(() => { if (!loading) idb.set('tasks', tasks); }, [tasks, loading]);
    useEffect(() => { if (!loading) idb.set('trash', deletedTasks); }, [deletedTasks, loading]);

    const syncWithCloud = useCallback(async (currentTasks, currentTrash, currentToken) => {
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
                    const cloudData = await dl.json();
                    if (cloudData.tasks) { setTasks(cloudData.tasks); setDeletedTasks(cloudData.trash || []); }
                }
            }
            const metadata = { name: DRIVE_FILE_NAME, parents: driveFileId.current ? undefined : ['appDataFolder'] };
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', new Blob([JSON.stringify({ tasks: currentTasks, trash: currentTrash })], { type: 'application/json' }));
            
            await fetch(driveFileId.current ? `https://www.googleapis.com/upload/drive/v3/files/${driveFileId.current}?uploadType=multipart` : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
                method: driveFileId.current ? 'PATCH' : 'POST',
                headers: { Authorization: `Bearer ${currentToken}` },
                body: formData
            });
        } catch (e) { console.error("Sync error:", e); }
        setSyncing(false);
    }, [syncing]);

    useEffect(() => {
        const t = setTimeout(() => { if (token) syncWithCloud(tasks, deletedTasks, token); }, 5000);
        return () => clearTimeout(t);
    }, [tasks, deletedTasks, token, syncWithCloud]);

    const login = () => {
        if (!window.google) { alert("Google tizimi yuklanmadi. Sahifani yangilang."); return; }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.appdata profile email',
            callback: async (res) => {
                if (res.access_token) {
                    setToken(res.access_token);
                    const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${res.access_token}` } });
                    const u = await uRes.json();
                    const prof = { name: u.name, email: u.email, picture: u.picture };
                    setUser(prof); idb.set('auth', { user: prof, token: res.access_token });
                }
            }
        });
        client.requestAccessToken();
    };

    return html`
        <${TaskContext.Provider} value=${{ tasks, deletedTasks, user, syncing, login, 
            logout: () => { setUser(null); setToken(null); idb.del('auth'); },
            addTask: (d) => setTasks([{ ...d, id: Math.random().toString(36).substr(2,6).toUpperCase() }, ...tasks]),
            deleteTask: (id) => { const t = tasks.find(x => x.id === id); if(t) { setDeletedTasks([t, ...deletedTasks]); setTasks(tasks.filter(x => x.id !== id)); } },
            restoreTask: (id) => { const t = deletedTasks.find(x => x.id === id); if(t) { setTasks([t, ...tasks]); setDeletedTasks(deletedTasks.filter(x => x.id !== id)); } }
        }}>
            ${children}
        <//>
    `;
};

const Sidebar = ({ view, setView }) => {
    const { user, login, logout, syncing, deletedTasks } = useContext(TaskContext);
    return html`
        <aside class="w-full md:w-64 bg-teal-800 text-white flex flex-col h-screen shadow-2xl z-50">
            <div class="p-6 border-b border-teal-700 flex items-center space-x-3">
                <div class="w-8 h-8 bg-white rounded flex items-center justify-center"><span class="text-teal-800 font-black">X</span></div>
                <h1 class="font-bold">XISOBOT PRO</h1>
            </div>
            <div class="p-4 border-b border-teal-700">
                ${user ? html`
                    <div class="flex items-center space-x-3 bg-teal-900/40 p-2 rounded-xl">
                        <img src=${user.picture} class="w-8 h-8 rounded-full" />
                        <div class="flex-1 overflow-hidden">
                            <p class="text-[10px] font-bold truncate">${user.name}</p>
                            <p class="text-[9px] text-teal-300">${syncing ? 'Sinxron...' : 'Bulutda'}</p>
                        </div>
                        <button onClick=${logout} class="text-teal-400 hover:text-white"><${Lucide.LogOut} size="14" /><//>
                    </div>
                ` : html`<button onClick=${login} class="w-full py-2 bg-white text-teal-800 rounded-lg text-xs font-bold shadow-md">Google Login</button>`}
            </div>
            <nav class="flex-1 p-4 space-y-1">
                <button onClick=${() => setView('dashboard')} class="w-full flex items-center px-4 py-3 rounded-xl ${view === 'dashboard' ? 'bg-teal-900' : 'hover:bg-teal-700/50'}">
                    <${Lucide.LayoutDashboard} size="18" class="mr-3" /> <span class="text-sm">Dashboard</span>
                </button>
                <button onClick=${() => setView('tasks')} class="w-full flex items-center px-4 py-3 rounded-xl ${view === 'tasks' ? 'bg-teal-900' : 'hover:bg-teal-700/50'}">
                    <${Lucide.ListTodo} size="18" class="mr-3" /> <span class="text-sm">Vazifalar</span>
                </button>
                <button onClick=${() => setView('trash')} class="w-full flex items-center justify-between px-4 py-3 rounded-xl ${view === 'trash' ? 'bg-red-900/40' : 'hover:bg-red-900/10'}">
                    <div class="flex items-center"><${Lucide.Trash2} size="18" class="mr-3" /> <span class="text-sm">Savat</span></div>
                    ${deletedTasks.length > 0 && html`<span class="bg-red-500 text-[10px] px-2 rounded-full">${deletedTasks.length}</span>`}
                </button>
            </nav>
            <div class="p-4 text-center border-t border-teal-700"><p class="text-[9px] text-teal-400 uppercase tracking-widest font-bold">by Zikrulloh</p></div>
        </aside>
    `;
};

const Dashboard = () => {
    const { tasks } = useContext(TaskContext);
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const weekly = tasks.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    const stats = {
        done: weekly.filter(t => t.status === 'Bajarildi').length,
        doing: weekly.filter(t => t.status === 'Jarayonda').length,
        todo: weekly.filter(t => t.status === 'Rejada').length
    };
    return html`
        <div class="space-y-6">
            <h2 class="text-xl font-bold">Haftalik Hisobot</h2>
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-white p-4 rounded-2xl shadow-sm border">
                    <p class="text-xs text-slate-500">Bajarildi</p><p class="text-xl font-bold text-green-600">${stats.done}</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border">
                    <p class="text-xs text-slate-500">Jarayonda</p><p class="text-xl font-bold text-amber-600">${stats.doing}</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border">
                    <p class="text-xs text-slate-500">Rejada</p><p class="text-xl font-bold text-blue-600">${stats.todo}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div class="bg-slate-100 p-3 rounded-2xl min-h-[400px]">
                        <p class="text-xs font-bold mb-3 uppercase text-slate-500">${s}</p>
                        <div class="space-y-2">
                            ${weekly.filter(t => t.status === s).map(t => html`
                                <div class="bg-white p-3 rounded-xl shadow-sm text-xs border border-slate-200">
                                    <p class="font-bold truncate">${t.title}</p>
                                    <p class="text-slate-500 line-clamp-2 mt-1">${t.desc}</p>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const TaskList = () => {
    const { tasks, addTask, deleteTask } = useContext(TaskContext);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');

    const onSubmit = (e) => {
        e.preventDefault();
        if(!title) return;
        addTask({ title, desc, status: 'Rejada', date: format(new Date(), 'yyyy-MM-dd') });
        setTitle(''); setDesc('');
    };

    return html`
        <div class="space-y-6">
            <h2 class="text-xl font-bold">Vazifalar</h2>
            <form onSubmit=${onSubmit} class="bg-white p-4 rounded-2xl border shadow-sm flex gap-2">
                <input placeholder="Vazifa nomi" value=${title} onChange=${e => setTitle(e.target.value)} class="flex-1 p-2 text-sm border rounded-xl" />
                <input placeholder="Tavsif" value=${desc} onChange=${e => setDesc(e.target.value)} class="flex-1 p-2 text-sm border rounded-xl" />
                <button class="px-6 bg-teal-700 text-white rounded-xl text-sm font-bold">Qo'shish</button>
            </form>
            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-50 border-b">
                        <tr><th class="p-4">Vazifa</th><th class="p-4">Status</th><th class="p-4">Amal</th></tr>
                    </thead>
                    <tbody>
                        ${tasks.map(t => html`
                            <tr class="border-b last:border-0">
                                <td class="p-4">
                                    <p class="font-bold">${t.title}</p>
                                    <p class="text-slate-500">${t.desc}</p>
                                </td>
                                <td class="p-4"><span class="px-2 py-0.5 bg-slate-100 rounded">${t.status}</span></td>
                                <td class="p-4">
                                    <button onClick=${() => deleteTask(t.id)} class="text-red-400 hover:text-red-600"><${Lucide.Trash2} size="16" /><//>
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const Trash = () => {
    const { deletedTasks, restoreTask } = useContext(TaskContext);
    return html`
        <div class="space-y-6">
            <h2 class="text-xl font-bold">Savat</h2>
            <div class="bg-white rounded-2xl border">
                ${deletedTasks.length === 0 ? html`<p class="p-20 text-center text-slate-400">Savat bo'sh</p>` : deletedTasks.map(t => html`
                    <div class="p-4 border-b last:border-0 flex justify-between items-center">
                        <p class="text-sm font-bold">${t.title}</p>
                        <button onClick=${() => restoreTask(t.id)} class="text-xs bg-teal-50 text-teal-700 px-4 py-1 rounded-lg font-bold">Tiklash</button>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const App = () => {
    const [view, setView] = useState('dashboard');
    return html`
        <${TaskProvider}>
            <div class="flex h-screen bg-slate-50 overflow-hidden">
                <${Sidebar} view=${view} setView=${setView} />
                <main class="flex-1 p-10 overflow-y-auto custom-scrollbar">
                    ${view === 'dashboard' && html`<${Dashboard} />`}
                    ${view === 'tasks' && html`<${TaskList} />`}
                    ${view === 'trash' && html`<${Trash} />`}
                </main>
            </div>
        <//>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
