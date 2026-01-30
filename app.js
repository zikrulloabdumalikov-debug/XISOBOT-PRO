import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as Lucide from 'lucide-react';
import { 
    format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, startOfDay, 
    endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, 
    subYears, startOfQuarter, endOfQuarter, setMonth 
} from 'date-fns';
import { uz } from 'date-fns/locale';
import * as idb from 'idb-keyval';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const html = htm.bind(React.createElement);
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; 
const DRIVE_FILE_NAME = 'xisobot_pro_ultimate_v4.json';

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
        case 'q1': return { start: startOfQuarter(setMonth(now, 0)), end: endOfQuarter(setMonth(now, 2)) };
        case 'q2': return { start: startOfQuarter(setMonth(now, 3)), end: endOfQuarter(setMonth(now, 5)) };
        case 'q3': return { start: startOfQuarter(setMonth(now, 6)), end: endOfQuarter(setMonth(now, 8)) };
        case 'q4': return { start: startOfQuarter(setMonth(now, 9)), end: endOfQuarter(setMonth(now, 11)) };
        case 'half1': return { start: startOfYear(now), end: endOfMonth(setMonth(now, 5)) };
        case 'half2': return { start: startOfMonth(setMonth(now, 6)), end: endOfYear(now) };
        case 'thisYear': return { start: startOfYear(now), end: endOfYear(now) };
        case 'prevYear': return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
        default: return getWeekRange(now);
    }
};

const checkOverdue = (dedlayn, status) => {
    if (!dedlayn || status === 'Bajarildi') return false;
    return isBefore(parseISO(dedlayn), startOfDay(new Date()));
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

    const sync = useCallback(async (currTasks, currTrash, currToken) => {
        if (!currToken || syncing) return;
        setSyncing(true);
        try {
            if (!driveFileId.current) {
                const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}'&spaces=appDataFolder`, {
                    headers: { Authorization: `Bearer ${currToken}` }
                });
                const data = await res.json();
                if (data.files && data.files.length > 0) {
                    driveFileId.current = data.files[0].id;
                    const dl = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId.current}?alt=media`, {
                        headers: { Authorization: `Bearer ${currToken}` }
                    });
                    const cloud = await dl.json();
                    if (cloud.tasks) { setTasks(cloud.tasks); setDeletedTasks(cloud.trash || []); }
                }
            }
            const metadata = { name: DRIVE_FILE_NAME, parents: driveFileId.current ? undefined : ['appDataFolder'] };
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', new Blob([JSON.stringify({ tasks: currTasks, trash: currTrash, date: new Date() })], { type: 'application/json' }));
            await fetch(driveFileId.current ? `https://www.googleapis.com/upload/drive/v3/files/${driveFileId.current}?uploadType=multipart` : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
                method: driveFileId.current ? 'PATCH' : 'POST',
                headers: { Authorization: `Bearer ${currToken}` },
                body: formData
            });
        } catch (e) { console.error("Sync error", e); }
        setSyncing(false);
    }, [syncing]);

    useEffect(() => {
        const t = setTimeout(() => { if (token) sync(tasks, deletedTasks, token); }, 5000);
        return () => clearTimeout(t);
    }, [tasks, deletedTasks, token, sync]);

    return html`
        <${TaskContext.Provider} value=${{ 
            tasks, deletedTasks, user, syncing, loading,
            login: () => {
                window.google.accounts.oauth2.initTokenClient({
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
                }).requestAccessToken();
            },
            logout: () => { setUser(null); setToken(null); idb.del('auth'); },
            addTask: (d) => setTasks([{ ...d, id: generateTaskId([...tasks, ...deletedTasks]) }, ...tasks]),
            updateTask: (u) => setTasks(tasks.map(t => t.id === u.id ? u : t)),
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

// --- Sub-Components ---

const KPICard = ({ label, count, icon, color, bg }) => html`
    <div class="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between">
        <div>
            <p class="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">${label}</p>
            <p class="text-3xl font-black text-slate-800">${count}</p>
        </div>
        <div class="p-4 ${bg} ${color} rounded-2xl shadow-inner">
            <${Lucide[icon]} size="28" />
        </div>
    </div>
`;

const TaskForm = ({ task, onSubmit, onCancel }) => {
    const [data, setData] = useState(task || { vazifa: '', tavsif: '', status: 'Rejada', prioritet: 'Muhum', progress: 0, date: format(new Date(), 'yyyy-MM-dd'), dedlayn: '', izoh: '' });
    return html`
        <form onSubmit=${(e) => { e.preventDefault(); onSubmit(data); }} class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] font-black text-slate-400 uppercase">Sana</label>
                <input type="date" value=${data.date} onChange=${e => setData({...data, date: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-2xl mt-1 text-sm" /></div>
                <div><label class="text-[10px] font-black text-slate-400 uppercase">Dedlayn</label>
                <input type="date" value=${data.dedlayn} onChange=${e => setData({...data, dedlayn: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-2xl mt-1 text-sm" /></div>
            </div>
            <div><label class="text-[10px] font-black text-slate-400 uppercase">Vazifa</label>
            <input required value=${data.vazifa} onChange=${e => setData({...data, vazifa: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-2xl mt-1 text-sm" /></div>
            <div><label class="text-[10px] font-black text-slate-400 uppercase">Tavsif</label>
            <textarea value=${data.tavsif} onChange=${e => setData({...data, tavsif: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-2xl mt-1 text-sm" rows="3"><//></div>
            <div class="grid grid-cols-3 gap-4">
                <div><label class="text-[10px] font-black text-slate-400 uppercase">Status</label>
                <select value=${data.status} onChange=${e => setData({...data, status: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-2xl mt-1 text-sm">
                    <option>Rejada</option><option>Jarayonda</option><option>Bajarildi</option>
                </select></div>
                <div><label class="text-[10px] font-black text-slate-400 uppercase">Prioritet</label>
                <select value=${data.prioritet} onChange=${e => setData({...data, prioritet: e.target.value})} class="w-full p-3 bg-slate-50 border rounded-2xl mt-1 text-sm">
                    <option>Juda muhum</option><option>Muhum</option><option>Muhum emas</option>
                </select></div>
                <div><label class="text-[10px] font-black text-slate-400 uppercase">Progress %</label>
                <input type="number" value=${data.progress} onChange=${e => setData({...data, progress: parseInt(e.target.value)})} class="w-full p-3 bg-slate-50 border rounded-2xl mt-1 text-sm" /></div>
            </div>
            <div class="flex gap-3 pt-6">
                <button type="button" onClick=${onCancel} class="flex-1 py-4 border rounded-2xl font-bold text-slate-600">BEKOR</button>
                <button type="submit" class="flex-1 py-4 bg-teal-700 text-white rounded-2xl font-bold shadow-lg">SAQLASH</button>
            </div>
        </form>
    `;
};

// --- Main Views ---

const Dashboard = () => {
    const { tasks } = useContext(TaskContext);
    const [range, setRange] = useState({ ...getWeekRange(new Date()), preset: 'thisWeek' });
    const dashboardRef = useRef(null);

    const filtered = tasks.filter(t => isWithinInterval(parseISO(t.date), { start: range.start, end: range.end }));
    const stats = {
        done: filtered.filter(t => t.status === 'Bajarildi').length,
        doing: filtered.filter(t => t.status === 'Jarayonda').length,
        todo: filtered.filter(t => t.status === 'Rejada').length,
        total: filtered.length
    };

    const exportFile = async (type) => {
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc' });
        if (type === 'png') {
            const l = document.createElement('a'); l.download = `xisobot_${range.preset}.png`; l.href = canvas.toDataURL(); l.click();
        } else {
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
            pdf.save(`hisobot_${range.preset}.pdf`);
        }
    };

    return html`
        <div class="space-y-8 animate-in fade-in duration-500">
            <header class="flex justify-between items-end">
                <div>
                    <p class="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-1">PRO MONITORING</p>
                    <h2 class="text-3xl font-black text-slate-800">Boshqaruv Paneli</h2>
                </div>
                <div class="flex gap-2">
                    <button onClick=${() => exportFile('png')} class="bg-white border p-3 rounded-2xl shadow-sm text-teal-600 hover:scale-105 transition"><${Lucide.Image} size="20" /><//>
                    <button onClick=${() => exportFile('pdf')} class="bg-white border p-3 rounded-2xl shadow-sm text-red-600 hover:scale-105 transition"><${Lucide.FileText} size="20" /><//>
                </div>
            </header>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <${KPICard} label="Bajarildi" count=${stats.done} icon="CheckCircle2" color="text-green-600" bg="bg-green-50" />
                <${KPICard} label="Jarayonda" count=${stats.doing} icon="Clock" color="text-amber-600" bg="bg-amber-50" />
                <${KPICard} label="Rejada" count=${stats.todo} icon="Circle" color="text-blue-600" bg="bg-blue-50" />
                <${KPICard} label="Jami" count=${stats.total} icon="Layers" color="text-teal-600" bg="bg-teal-50" />
            </div>

            <div class="bg-white p-2 rounded-[2.5rem] border shadow-sm flex flex-wrap gap-1 overflow-x-auto">
                ${['today', 'yesterday', 'thisWeek', 'prevWeek', 'thisMonth', 'q1', 'q2', 'q3', 'q4', 'half1', 'half2', 'thisYear'].map(p => html`
                    <button onClick=${() => setRange({...getPresetRange(p), preset: p})} 
                            class="px-5 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition ${range.preset === p ? 'bg-teal-700 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}">
                        ${p}
                    </button>
                `)}
            </div>

            <div ref=${dashboardRef} class="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
                ${['Bajarildi', 'Jarayonda', 'Rejada'].map(s => html`
                    <div class="bg-slate-100/50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 min-h-[600px]">
                        <h3 class="font-black text-slate-400 uppercase text-[11px] tracking-[0.2em] mb-6 flex justify-between items-center px-2">
                            ${s} <span class="bg-white px-3 py-1 rounded-full border text-slate-800 text-[10px]">${filtered.filter(t => t.status === s).length}</span>
                        </h3>
                        <div class="space-y-4">
                            ${filtered.filter(t => t.status === s).map(t => html`
                                <div class="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 group hover:shadow-xl transition-all duration-300">
                                    <div class="flex justify-between items-start mb-3">
                                        <span class="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-500 uppercase tracking-tighter border">${t.prioritet}</span>
                                        ${checkOverdue(t.dedlayn, t.status) && html`<span class="text-red-500 animate-pulse"><${Lucide.AlertTriangle} size="14" /><//>`}
                                    </div>
                                    <h4 class="font-bold text-slate-800 text-sm leading-tight group-hover:text-teal-700">${t.vazifa}</h4>
                                    <div class="mt-4 space-y-2">
                                        <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>Progress</span> <span>${t.progress}%</span></div>
                                        <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                                            <div class="bg-teal-600 h-full rounded-full transition-all duration-500" style="width: ${t.progress}%"></div>
                                        </div>
                                    </div>
                                    <div class="mt-4 pt-4 border-t flex items-center justify-between text-[9px] text-slate-400 font-black uppercase">
                                        <span class="flex items-center"><${Lucide.Calendar} size="10" class="mr-1" /> ${t.date}</span>
                                        <span class="font-mono text-slate-300">#${t.id}</span>
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const TasksPage = () => {
    const { tasks, addTask, deleteTask, updateTask } = useContext(TaskContext);
    const [isForm, setIsForm] = useState(false);
    const [edit, setEdit] = useState(null);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'id', dir: 'desc' });

    const filtered = useMemo(() => {
        let res = tasks.filter(t => t.vazifa.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search));
        return res.sort((a, b) => {
            const vA = a[sort.key], vB = b[sort.key];
            return sort.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
        });
    }, [tasks, search, sort]);

    return html`
        <div class="space-y-6">
            <header class="flex justify-between items-center">
                <div><h2 class="text-3xl font-black text-slate-800">Vazifalar Ro'yxati</h2></div>
                <div class="flex gap-2">
                    <button onClick=${() => XLSX.writeFile(XLSX.utils.book_new(), "data.xlsx")} class="bg-white border px-5 py-3 rounded-2xl shadow-sm font-black text-[11px] uppercase tracking-widest flex items-center">
                        <${Lucide.Download} size="16" class="mr-2 text-teal-600" /> EXCEL
                    </button>
                    <button onClick=${() => setIsForm(true)} class="bg-teal-700 text-white px-5 py-3 rounded-2xl shadow-lg font-black text-[11px] uppercase tracking-widest flex items-center">
                        <${Lucide.Plus} size="16" class="mr-2" /> YANGI QO'SHISH
                    </button>
                </div>
            </header>

            <div class="bg-white p-2 rounded-2xl border shadow-sm flex items-center px-5">
                <${Lucide.Search} size="18" class="text-slate-400 mr-4" />
                <input placeholder="Qidiruv..." value=${search} onChange=${e => setSearch(e.target.value)} class="w-full py-4 text-sm bg-transparent outline-none font-medium" />
            </div>

            <div class="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                <table class="w-full text-sm text-left border-collapse">
                    <thead class="bg-slate-50 border-b text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <tr>
                            <th class="px-6 py-5 cursor-pointer hover:text-teal-600" onClick=${() => setSort({key:'id', dir:sort.dir==='asc'?'desc':'asc'})}>ID</th>
                            <th class="px-6 py-5">Vazifa</th>
                            <th class="px-6 py-5 cursor-pointer hover:text-teal-600" onClick=${() => setSort({key:'date', dir:sort.dir==='asc'?'desc':'asc'})}>Sana</th>
                            <th class="px-6 py-5">Status</th>
                            <th class="px-6 py-5">Progress</th>
                            <th class="px-6 py-5 text-right">Amal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${filtered.map(t => html`
                            <tr key=${t.id} class="hover:bg-slate-50/80 transition group">
                                <td class="px-6 py-5 font-mono text-xs text-slate-400">#${t.id}</td>
                                <td class="px-6 py-5"><p class="font-bold text-slate-800">${t.vazifa}</p><p class="text-[11px] text-slate-400 italic truncate max-w-xs">${t.tavsif}</p></td>
                                <td class="px-6 py-5 text-slate-500 font-bold">${t.date}</td>
                                <td class="px-6 py-5">
                                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${t.status === 'Bajarildi' ? 'bg-green-100 text-green-700' : t.status === 'Jarayonda' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
                                        ${t.status}
                                    </span>
                                </td>
                                <td class="px-6 py-5"><div class="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden"><div class="bg-teal-600 h-full" style="width:${t.progress}%"></div></div></td>
                                <td class="px-6 py-5 text-right">
                                    <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick=${() => setEdit(t)} class="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><${Lucide.Edit3} size="16" /><//>
                                        <button onClick=${() => deleteTask(t.id)} class="p-2 text-red-500 hover:bg-red-50 rounded-xl"><${Lucide.Trash2} size="16" /><//>
                                    </div>
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>

            <${Modal} isOpen=${isForm || !!edit} onClose=${() => { setIsForm(false); setEdit(null); }} title=${edit ? "Tahrirlash" : "Yangi vazifa"}>
                <${TaskForm} task=${edit} onSubmit=${(d) => { edit ? updateTask(d) : addTask(d); setIsForm(false); setEdit(null); }} onCancel=${() => { setIsForm(false); setEdit(null); }} />
            <//>
        </div>
    `;
};

const TrashPage = () => {
    const { deletedTasks, restoreTask, clearTrash } = useContext(TaskContext);
    return html`
        <div class="space-y-6">
            <header class="flex justify-between items-center">
                <div><h2 class="text-3xl font-black text-slate-800">Savat</h2></div>
                <button onClick=${clearTrash} class="bg-red-50 text-red-600 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition">SAVATNI TOZALASH</button>
            </header>
            <div class="bg-white rounded-[2rem] border shadow-sm">
                ${deletedTasks.length === 0 ? html`<div class="py-32 text-center text-slate-300 italic font-medium">Hech narsa topilmadi</div>` : deletedTasks.map(t => html`
                    <div key=${t.id} class="p-6 border-b last:border-0 flex justify-between items-center hover:bg-slate-50 transition">
                        <div><p class="font-bold text-slate-800">${t.vazifa}</p><p class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">ID: #${t.id} | Sana: ${t.date}</p></div>
                        <button onClick=${() => restoreTask(t.id)} class="bg-teal-50 text-teal-700 px-6 py-2 rounded-xl text-[10px] font-black hover:bg-teal-100 transition">TIKLASH</button>
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

    const NavBtn = ({ id, icon, label }) => html`
        <button onClick=${() => setView(id)} class="w-full flex items-center px-5 py-4 rounded-2xl transition-all duration-300 ${view === id ? 'bg-teal-900 shadow-xl scale-105' : 'hover:bg-teal-700/50 text-teal-100/70 hover:text-white'}">
            <${Lucide[icon]} size="20" class="mr-4" /> <span class="font-black text-[11px] uppercase tracking-widest">${label}</span>
        </button>
    `;

    return html`
        <div class="flex h-screen bg-slate-50 overflow-hidden font-['Inter']">
            <aside class="hidden md:flex flex-col w-80 bg-teal-800 text-white shadow-2xl z-50">
                <div class="p-10 border-b border-teal-700/50 flex items-center gap-5">
                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl rotate-3"><span class="text-teal-800 font-black text-2xl">X</span></div>
                    <div><h1 class="font-black text-xl tracking-tighter leading-none">XISOBOT</h1><p class="text-[9px] text-teal-400 font-black tracking-[0.4em] uppercase mt-1">Version 4.0</p></div>
                </div>

                <div class="p-6">
                    ${user ? html`
                        <div class="flex items-center gap-4 bg-teal-900/60 p-4 rounded-3xl border border-teal-700/50 shadow-inner">
                            <img src=${user.picture} class="w-12 h-12 rounded-2xl border-2 border-teal-500 shadow-lg" />
                            <div class="flex-1 overflow-hidden">
                                <p class="text-xs font-black truncate">${user.name}</p>
                                <p class="text-[9px] font-black uppercase tracking-widest flex items-center mt-1 ${syncing ? 'text-amber-400' : 'text-teal-400'}">
                                    ${syncing ? html`<${Lucide.Loader2} size="10" class="animate-spin mr-1" /> Sinx...` : html`<${Lucide.Cloud} size="10" class="mr-1 text-green-400" /> Bulutda`}
                                </p>
                            </div>
                            <button onClick=${logout} class="text-teal-400 hover:text-white transition p-2 hover:bg-red-500/20 rounded-xl"><${Lucide.LogOut} size="16" /><//>
                        </div>
                    ` : html`
                        <button onClick=${login} class="w-full py-4 bg-white text-teal-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition active:scale-95">GOOGLE BULUTGA ULANISH</button>
                    `}
                </div>

                <nav class="flex-1 p-6 space-y-3">
                    <${NavBtn} id="dashboard" icon="LayoutDashboard" label="Monitoring" />
                    <${NavBtn} id="tasks" icon="ListTodo" label="Vazifalar" />
                    <div class="pt-6 mt-6 border-t border-teal-700/30">
                        <button onClick=${() => setView('trash')} class="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 ${view === 'trash' ? 'bg-red-900/40' : 'hover:bg-red-900/10 text-teal-100/70'}">
                            <div class="flex items-center"><${Lucide.Trash2} size="20" class="mr-4" /> <span class="font-black text-[11px] uppercase tracking-widest">Savat</span></div>
                            ${deletedTasks.length > 0 && html`<span class="bg-red-500 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg">${deletedTasks.length}</span>`}
                        </button>
                    </div>
                </nav>

                <div class="p-10 border-t border-teal-700/30 text-center">
                    <p class="text-[10px] font-black uppercase tracking-[0.5em] text-teal-400 opacity-40">by Zikrulloh</p>
                </div>
            </aside>

            <main class="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar relative">
                <div class="max-w-6xl mx-auto pb-32">
                    ${view === 'dashboard' && html`<${Dashboard} />`}
                    ${view === 'tasks' && html`<${TasksPage} />`}
                    ${view === 'trash' && html`<${TrashPage} />`}
                </div>
            </main>
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${TaskProvider}><${App} /><//>`);
