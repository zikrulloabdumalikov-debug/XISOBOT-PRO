
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { generateTaskId, showToast } from '../utils.js';

export const useFirestore = (user) => {
    const [tasks, setTasks] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState(null);

    // Real-time Subscription
    useEffect(() => {
        if (!user) {
            setTasks([]);
            setDataLoading(false);
            return;
        }

        setDataLoading(true);
        const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setTasks(data);
            setDataLoading(false);
        }, (err) => {
            console.error("Firestore Error:", err);
            setError(err);
            setDataLoading(false);
            showToast("Ma'lumotlarni yuklashda xatolik: " + err.message, 'error');
        });

        return () => unsubscribe();
    }, [user]);

    // Actions
    const addTask = async (data) => {
        if (!user) return;
        try {
            const newNumericId = generateTaskId(tasks);
            await addDoc(collection(db, 'tasks'), {
                ...data,
                numericId: newNumericId,
                userId: user.uid,
                isDeleted: false,
                createdAt: serverTimestamp()
            });
            showToast("Vazifa muvaffaqiyatli qo'shildi!", "success");
        } catch (e) { 
            showToast("Vazifa qo'shishda xatolik: " + e.message, "error");
        }
    };

    const updateTask = async (updated) => {
        if (!user || !updated.id) return;
        try {
            const taskDoc = doc(db, 'tasks', updated.id);
            const { id, ...rest } = updated;
            await updateDoc(taskDoc, rest);
            showToast("Vazifa saqlandi", "success");
        } catch (e) { 
            showToast("Yangilashda xatolik: " + e.message, "error");
        }
    };

    const deleteTask = async (id) => {
        if (!user || !id) return;
        try {
            const taskDoc = doc(db, 'tasks', id);
            await updateDoc(taskDoc, { isDeleted: true });
            showToast("Vazifa savatga o'tkazildi", "success");
        } catch (e) { 
            showToast("O'chirishda xatolik: " + e.message, "error");
        }
    };

    const restoreTask = async (id) => {
        if (!user || !id) return;
        try {
            const taskDoc = doc(db, 'tasks', id);
            await updateDoc(taskDoc, { isDeleted: false });
            showToast("Vazifa qayta tiklandi", "success");
        } catch (e) { 
            showToast("Tiklashda xatolik: " + e.message, "error");
        }
    };

    const clearTrash = async () => {
        if (!user) return;
        const toDelete = tasks.filter(t => t.isDeleted);
        if (toDelete.length === 0) return;

        try { 
            for (const t of toDelete) {
                await deleteDoc(doc(db, 'tasks', t.id)); 
            }
            showToast("Savat tozalandi", "success");
        } catch(e) { 
            showToast("Savatni tozalashda xatolik", "error");
        }
    };

    return { 
        tasks, 
        dataLoading, 
        error, 
        addTask, 
        updateTask, 
        deleteTask, 
        restoreTask, 
        clearTrash 
    };
};
