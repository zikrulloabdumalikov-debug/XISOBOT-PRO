
import React, { createContext, useState, useEffect } from 'react';
import * as idb from 'idb-keyval';
import { generateTaskId } from './utils.js';

export const TaskContext = createContext({
    tasks: [],
    deletedTasks: [],
    loading: true,
    addTask: () => {},
    updateTask: () => {},
    deleteTask: () => {},
    restoreTask: () => {},
    clearTrash: () => {}
});

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [deletedTasks, setDeletedTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [t, d] = await Promise.all([
                    idb.get('xisobot_tasks'), 
                    idb.get('xisobot_trash')
                ]);
                if (Array.isArray(t)) setTasks(t);
                if (Array.isArray(d)) setDeletedTasks(d);
            } catch (error) {
                console.error("Ma'lumotlarni yuklashda xatolik:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!loading) {
            idb.set('xisobot_tasks', tasks).catch(e => console.error("Saqlashda xato:", e));
            idb.set('xisobot_trash', deletedTasks).catch(e => console.error("Savatda xato:", e));
        }
    }, [tasks, deletedTasks, loading]);

    const addTask = (data) => {
        const id = generateTaskId([...tasks, ...deletedTasks]);
        setTasks(prev => [{ ...data, id }, ...prev]);
    };

    const updateTask = (updated) => {
        // MUHIM TUZATISH: Eski ma'lumotlarni saqlab qolgan holda yangilash (Merge)
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    };

    const deleteTask = (id) => {
        const target = tasks.find(t => t.id === id);
        if (target) {
            setDeletedTasks(prev => [target, ...prev]);
            setTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    const restoreTask = (id) => {
        const target = deletedTasks.find(t => t.id === id);
        if (target) {
            setTasks(prev => [target, ...prev]);
            setDeletedTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    const value = { 
        tasks, 
        deletedTasks, 
        loading, 
        addTask, 
        updateTask, 
        deleteTask, 
        restoreTask, 
        clearTrash: () => setDeletedTasks([]) 
    };

    return React.createElement(TaskContext.Provider, { value }, children);
};
