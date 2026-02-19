
import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, provider } from '../firebase.js';
import { showToast } from '../utils.js';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        try { 
            await signInWithPopup(auth, provider); 
            showToast("Tizimga xush kelibsiz!", "success");
        } catch (e) { 
            showToast("Kirishda xatolik: " + e.message, "error");
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            showToast("Tizimdan chiqildi", "info");
        } catch (e) {
            showToast("Chiqishda xatolik", "error");
        }
    };

    return { user, authLoading, login, logout };
};
