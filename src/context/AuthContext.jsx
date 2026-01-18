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
                console.log('[DEBUG] Restored session user:', parsedSession.user);
                console.log('[DEBUG] Restored church_id:', parsedSession.user?.church_id);
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
            // Query users table directly
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            console.log('[DEBUG] Login query result:', users);
            console.log('[DEBUG] User church_id from DB:', users?.church_id);

            if (error || !users) {
                console.error('[DEBUG] Login error:', error);
                toast.error('Email ou senha incorretos');
                return { error: error || new Error('Invalid credentials') };
            }

            // Fetch church info
            const { data: church, error: churchError } = await supabase
                .from('churches')
                .select('*')
                .eq('id', users.church_id)
                .single();

            console.log('[DEBUG] Church query result:', church);
            console.log('[DEBUG] Church error:', churchError);

            // Create session object with church info
            const sessionData = {
                user: { ...users, church },
                access_token: 'mock-token-' + Date.now(),
            };

            console.log('[DEBUG] Final session data:', sessionData);
            console.log('[DEBUG] Final churchId to store:', sessionData.user.church_id);

            setSession(sessionData);
            setUser(sessionData.user);
            localStorage.setItem('redemption_session', JSON.stringify(sessionData));

            toast.success(`Bem-vindo, ${church?.name || 'Igreja'}!`);
            return { data: sessionData };
        } catch (error) {
            console.error('[DEBUG] Catch error:', error);
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

    // Debug: log churchId whenever it changes
    const churchId = user?.church_id;
    console.log('[DEBUG] useAuth churchId value:', churchId);

    const value = {
        session,
        user,
        loading,
        login,
        logout,
        churchId,
        isAdmin: user?.role === 'admin',
        isLeader: user?.role === 'leader',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};

