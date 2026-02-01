
import React, { createContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { generateTaskId } from './utils.js';

const firebaseConfig = {
  apiKey: "AIzaSyAIasM8XWCPQdDfOBXxtOjUWUN84aKmov4",
  authDomain: "xisobotpro-e153b.firebaseapp.com",
  projectId: "xisobotpro-e153b",
  storageBucket: "xisobotpro-e153b.firebasestorage.app",
  messagingSenderId: "861517015010",
  appId: "1:861517015010:web:9667360edb9576cfd8bbbb",
  measurementId: "G-PTCPYXF9R1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export const TaskContext = createContext({
    user: null,
    tasks: [],
    deletedTasks: [],
    loading: true,
    error: null,
    login: () => {},
    logout: () => {},
    addTask: () => {},
    updateTask: () => {},
    deleteTask: () => {},
    restoreTask: () => {},
    clearTrash: () => {}
});

export const TaskProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) {
                setTasks([]);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Firestore Real-time Sync
    useEffect(() => {
        if (!user) return;

        setLoading(true);
        // Faqat shu foydalanuvchiga tegishli barcha vazifalarni olamiz
        const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    ...docData,
                    id: doc.id, // Firestore Document ID - bu juda muhim!
                    numericId: docData.numericId || doc.id.substring(0,6) // Vizual ID
                };
            });
            setTasks(data);
            setLoading(false);
        }, (err) => {
            console.error("Firestore Error:", err);
            setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const login = async () => {
        setError(null);
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error("Login error:", e);
            if (e.code === 'auth/unauthorized-domain') {
                const msg = "Xatolik: Domen ruxsat etilmagan. Sozlamalardan qo'shing.";
                setError(msg);
                alert(msg);
            } else {
                setError("Tizimga kirishda xatolik.");
            }
        }
    };

    const logout = () => signOut(auth);

    const addTask = async (data) => {
        if (!user) return;
        try {
            // Excel-style numeric ID yaratish
            const newNumericId = generateTaskId(tasks);
            
            await addDoc(collection(db, 'tasks'), {
                ...data,
                numericId: newNumericId,
                userId: user.uid,
                isDeleted: false, // Kelajakda Trash kerak bo'lsa
                createdAt: serverTimestamp()
            });
        } catch (e) { console.error("Add error:", e); }
    };

    const updateTask = async (updated) => {
        if (!user || !updated.id) return;
        try {
            const taskDoc = doc(db, 'tasks', updated.id);
            const { id, ...rest } = updated;
            await updateDoc(taskDoc, rest);
        } catch (e) { console.error("Update error:", e); }
    };

    const deleteTask = async (id) => {
        if (!user || !id) return;
        // User tasdiqlashini so'rash (ixtiyoriy, lekin Hard Delete uchun tavsiya etiladi)
        if (!confirm("Ushbu vazifa ma'lumotlar omboridan butunlay o'chiriladi. Ishonchingiz komilmi?")) return;
        
        try {
            // Firestore-dan butunlay o'chirish (Hard Delete)
            const taskDoc = doc(db, 'tasks', id);
            await deleteDoc(taskDoc);
        } catch (e) { 
            console.error("Delete error:", e);
            alert("O'chirishda xatolik: " + e.message);
        }
    };

    // Hard delete bo'lgani uchun restoreTask va clearTrash endi bazadagi 
    // isDeleted:true hujjatlar bilan ishlamaydi (agar ular bo'lsa).
    const restoreTask = async (id) => {
        if (!user || !id) return;
        try {
            const taskDoc = doc(db, 'tasks', id);
            await updateDoc(taskDoc, { isDeleted: false });
        } catch (e) { console.error("Restore error:", e); }
    };

    const clearTrash = async () => {
        if (!user) return;
        const toDelete = tasks.filter(t => t.isDeleted);
        for (const t of toDelete) {
            try { await deleteDoc(doc(db, 'tasks', t.id)); } catch(e) {}
        }
    };

    const value = { 
        user,
        tasks: tasks.filter(t => !t.isDeleted), 
        deletedTasks: tasks.filter(t => t.isDeleted), 
        loading,
        error,
        login,
        logout,
        addTask, 
        updateTask, 
        deleteTask, 
        restoreTask, 
        clearTrash
    };

    return React.createElement(TaskContext.Provider, { value }, children);
};
