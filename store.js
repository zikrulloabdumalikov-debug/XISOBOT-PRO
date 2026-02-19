
import React, { createContext, useMemo, useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useFirestore } from './hooks/useFirestore.js';

export const TaskContext = createContext({
    user: null,
    tasks: [],
    deletedTasks: [],
    loading: true,
    error: null,
    highlightedTaskId: null, // New state for search navigation
    setHighlightedTaskId: () => {}, // New setter
    login: () => {},
    logout: () => {},
    addTask: () => {},
    updateTask: () => {},
    deleteTask: () => {},
    restoreTask: () => {},
    clearTrash: () => {}
});

export const TaskProvider = ({ children }) => {
    // 1. Auth Hook
    const { user, authLoading, login, logout } = useAuth();
    
    // 2. Firestore Hook (Dependent on User)
    const { 
        tasks: allTasks, 
        dataLoading, 
        error, 
        addTask, 
        updateTask, 
        deleteTask, 
        restoreTask, 
        clearTrash 
    } = useFirestore(user);

    // 3. UI State for Search Navigation
    const [highlightedTaskId, setHighlightedTaskId] = useState(null);

    // 4. Derived State & Optimization
    const contextValue = useMemo(() => {
        return {
            user,
            // Filter active vs deleted tasks for the UI
            tasks: allTasks.filter(t => !t.isDeleted),
            deletedTasks: allTasks.filter(t => t.isDeleted),
            // Combine loading states: App is loading if Auth is checking OR Data is fetching
            loading: authLoading || dataLoading,
            error,
            highlightedTaskId,      // Exported state
            setHighlightedTaskId,   // Exported setter
            login,
            logout,
            addTask,
            updateTask,
            deleteTask,
            restoreTask,
            clearTrash
        };
    }, [
        user, 
        allTasks, 
        authLoading, 
        dataLoading, 
        error,
        highlightedTaskId, // Added to dependency array
        // Functions are stable from hooks
        login, logout, addTask, updateTask, deleteTask, restoreTask, clearTrash
    ]);

    return React.createElement(TaskContext.Provider, { value: contextValue }, children);
};
