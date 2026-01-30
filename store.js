
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import * as idb from 'idb-keyval';
import { generateTaskId } from './utils.js';

export const TaskContext = createContext();

const DRIVE_FILE_NAME = 'xisobot_pro_data_v5.json';
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // O'zingiznikini qo'ying

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [deletedTasks, setDeletedTasks] = useState([]);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);
    const driveFileId = useRef(null);

    // Initial Load
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

    // Local Storage persistence
    useEffect(() => {
        if (!loading) {
            idb.set('tasks', tasks);
            idb.set('trash', deletedTasks);
        }
    }, [tasks, deletedTasks, loading]);

    // Google Sync logic
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
                    if (cloud.tasks) { 
                        setTasks(cloud.tasks); 
                        setDeletedTasks(cloud.trash || []); 
                    }
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

    const login = () => {
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
    };

    return React.createElement(TaskContext.Provider, { 
        value: { 
            tasks, deletedTasks, user, syncing, loading, login,
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
        } 
    }, children);
};
