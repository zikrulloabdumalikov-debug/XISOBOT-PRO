
import React, { createContext, useState, useEffect } from 'react';
import * as idb from 'idb-keyval';
import { generateTaskId } from './utils.js';

export const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [deletedTasks, setDeletedTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const [t, d] = await Promise.all([idb.get('xisobot_tasks'), idb.get('xisobot_trash')]);
            if (t) setTasks(t);
            if (d) setDeletedTasks(d);
            setLoading(false);
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!loading) {
            idb.set('xisobot_tasks', tasks);
            idb.set('xisobot_trash', deletedTasks);
        }
    }, [tasks, deletedTasks, loading]);

    const addTask = (data) => {
        const id = generateTaskId([...tasks, ...deletedTasks]);
        setTasks(prev => [{ ...data, id }, ...prev]);
    };

    const updateTask = (updated) => {
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
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

    const value = { tasks, deletedTasks, loading, addTask, updateTask, deleteTask, restoreTask, clearTrash: () => setDeletedTasks([]) };
    return React.createElement(TaskContext.Provider, { value }, children);
};
