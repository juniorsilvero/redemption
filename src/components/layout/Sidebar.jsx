import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    BedDouble,
    Clock,
    Settings,
    LogOut,
    Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar({ className, onClose }) {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Gestão de Células', href: '/cells', icon: Users },
        { name: 'Escalas', href: '/scales', icon: ClipboardList },
        { name: 'Acomodações', href: '/accommodation', icon: BedDouble },
        { name: 'Relógio de Oração', href: '/prayer', icon: Clock },
        ...(isAdmin ? [{ name: 'Configurações', href: '/settings', icon: Settings }] : []),
    ];

    return (
        <div className={cn("flex h-full flex-col bg-[var(--color-sidebar)] text-white border-r border-[#2d2d2e]", className)}>
            <div className="flex h-16 items-center px-6 gap-3">
                <div className="bg-white/5 p-1.5 rounded-lg">
                    <img src="https://lucide.dev/logo.light.svg" className="h-6 w-6 opacity-0 absolute" alt="" />
                    {/* Placeholder icon since we don't have a logo asset */}
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-success)]"></div>
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white">REDEMPTION</h1>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Logística</p>
                </div>
            </div>

            <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                <div className="text-[10px] uppercase font-bold text-gray-600 px-3 mb-2 tracking-wider">Menu Principal</div>
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-gray-500 group-hover:text-white")} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 mt-auto">
                <div className="rounded-xl bg-white/5 p-4 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="truncate flex-1">
                            <p className="text-xs font-medium text-white max-w-[120px] truncate">{user?.user_metadata?.name || user?.email}</p>
                            <p className="text-[10px] text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Líder de Célula'}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="h-3 w-3" />
                        Sair
                    </button>
                </div>
            </div>
        </div>
    );
}
