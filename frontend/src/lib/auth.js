'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, getToken, setToken, setUser, removeToken, getUser } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUserState] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (token) {
            auth.me()
                .then(data => {
                    setUserState(data.user);
                    setUser(data.user);
                })
                .catch(() => {
                    removeToken();
                    setUserState(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const data = await auth.login({ email, password });
        setToken(data.token);
        setUser(data.user);
        setUserState(data.user);
        return data;
    };

    const register = async (userData) => {
        const data = await auth.register(userData);
        setToken(data.token);
        setUser(data.user);
        setUserState(data.user);
        return data;
    };

    const logout = () => {
        removeToken();
        setUserState(null);
        window.location.href = '/';
    };

    const refreshUser = async () => {
        try {
            const data = await auth.me();
            setUserState(data.user);
            setUser(data.user);
        } catch (e) { }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
