import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Task } from '../types';
import { generateTaskId } from '../utils/idUtils';
import * as idb from 'idb-keyval';
import * as drive from '../utils/googleDriveUtils';

interface UserInfo {
  name: string;
  email: string;
  picture: string;
}

interface TaskContextType {
  tasks: Task[];
  deletedTasks: Task[];
  loading: boolean;
  syncing: boolean;
  user: UserInfo | null;
  login: () => void;
  logout: () => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  permanentlyDeleteTask: (id: string) => void;
  clearTrash: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const DB_KEY = "xisobot_pro_storage_v1";
const TRASH_KEY = "xisobot_pro_trash_v1";
const AUTH_KEY = "xisobot_pro_auth_v1";

// Google Client ID - Buni Google Console'dan olasiz
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // PLACEHOLDER

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const driveFileId = useRef<string | null>(null);
  const syncTimer = useRef<number | null>(null);

  // 1. Initial Load (LocalStorage + Auth Check)
  useEffect(() => {
    const init = async () => {
      try {
        const [storedTasks, storedTrash, storedAuth] = await Promise.all([
          idb.get<Task[]>(DB_KEY),
          idb.get<Task[]>(TRASH_KEY),
          idb.get<any>(AUTH_KEY)
        ]);
        
        if (Array.isArray(storedTasks)) setTasks(storedTasks);
        if (Array.isArray(storedTrash)) setDeletedTasks(storedTrash);
        if (storedAuth) {
           setUser(storedAuth.user);
           setAccessToken(storedAuth.token);
        }
      } catch (e) {
        console.error("Local Load Error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Google Drive Sync Logic
  const syncWithDrive = useCallback(async (token: string, currentTasks: Task[], currentTrash: Task[]) => {
    if (syncing) return;
    setSyncing(true);
    try {
      if (!driveFileId.current) {
        const file = await drive.findAppDataFile(token);
        if (file) {
          driveFileId.current = file.id;
          const cloudData = await drive.downloadFileData(token, file.id);
          
          // Merge Logic: Local va Cloud ma'lumotlarini birlashtirish (sodda ko'rinishi)
          // Agar Cloud'da ma'lumot bo'lsa, uni localdan ustun ko'ramiz
          if (cloudData && cloudData.tasks) {
             setTasks(cloudData.tasks);
             setDeletedTasks(cloudData.deletedTasks || []);
          }
        }
      }

      // Cloud'ga saqlash
      await drive.uploadToDrive(token, driveFileId.current, {
        tasks: currentTasks,
        deletedTasks: currentTrash,
        lastSync: new Date().toISOString()
      });
    } catch (e) {
      console.error("Drive Sync Error:", e);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  // Debounced Auto-sync (Har bir o'zgarishdan keyin 2 sekund kutib bulutga yozadi)
  useEffect(() => {
    if (accessToken && !loading) {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        syncWithDrive(accessToken, tasks, deletedTasks);
      }, 2000);
    }
  }, [tasks, deletedTasks, accessToken, loading, syncWithDrive]);

  // Auth Functions
  const login = () => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.appdata openid profile email',
      callback: async (response: any) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          // Get User Profile
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` }
          });
          const userData = await userRes.json();
          const userInfo = { name: userData.name, email: userData.email, picture: userData.picture };
          setUser(userInfo);
          idb.set(AUTH_KEY, { user: userInfo, token: response.access_token });
        }
      },
    });
    client.requestAccessToken();
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    driveFileId.current = null;
    idb.del(AUTH_KEY);
  };

  // Local State Sync
  useEffect(() => {
    if (!loading) idb.set(DB_KEY, tasks);
  }, [tasks, loading]);

  useEffect(() => {
    if (!loading) idb.set(TRASH_KEY, deletedTasks);
  }, [deletedTasks, loading]);

  // Task Actions
  const addTask = useCallback((data: Omit<Task, 'id'>) => {
    setTasks(prev => [{ ...data, id: generateTaskId([...prev, ...deletedTasks]) }, ...prev]);
  }, [deletedTasks]);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task) {
        setDeletedTasks(old => [task, ...old]);
        return prev.filter(t => t.id !== id);
      }
      return prev;
    });
  }, []);

  const restoreTask = useCallback((id: string) => {
    setDeletedTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task) {
        setTasks(old => [task, ...old]);
        return prev.filter(t => t.id !== id);
      }
      return prev;
    });
  }, []);

  const permanentlyDeleteTask = useCallback((id: string) => {
    setDeletedTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearTrash = useCallback(() => setDeletedTasks([]), []);

  return (
    <TaskContext.Provider value={{ 
      tasks, deletedTasks, loading, syncing, user, login, logout, 
      addTask, updateTask, deleteTask, restoreTask, permanentlyDeleteTask, clearTrash 
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTasks must be used within TaskProvider");
  return context;
};