import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session in localStorage
        const storedSession = localStorage.getItem('redemption_session');
        if (storedSession) {
            try {
                const parsedSession = JSON.parse(storedSession);
                setSession(parsedSession);
                setUser(parsedSession.user);
            } catch (e) {
                console.error('Failed to parse session', e);
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            // Query users table directly (since we're using custom auth, not Supabase Auth)
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (error || !users) {
                toast.error('Email ou senha incorretos');
                return { error: error || new Error('Invalid credentials') };
            }

            // Create session object
            const sessionData = {
                user: users,
                access_token: 'mock-token-' + Date.now(),
            };

            setSession(sessionData);
            setUser(users);
            localStorage.setItem('redemption_session', JSON.stringify(sessionData));

            toast.success('Login bem-sucedido!');
            return { data: sessionData };
        } catch (error) {
            toast.error('Erro ao fazer login');
            return { error };
        }
    };

    const logout = async () => {
        setSession(null);
        setUser(null);
        localStorage.removeItem('redemption_session');
        toast.success('Logout realizado com sucesso.');
    };

    const value = {
        session,
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isLeader: user?.role === 'leader',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
