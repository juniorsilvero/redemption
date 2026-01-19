import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showInactiveModal, setShowInactiveModal] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Login attempt started for:', email);
        setIsLoading(true);
        try {
            const result = await login(email, password);
            console.log('Login result:', result);
            setIsLoading(false);

            if (result.data) {
                console.log('Login successful, navigating to home');
                navigate('/');
            } else if (result.error?.message === 'Church is inactive') {
                // Show custom modal for inactive church
                setShowInactiveModal(true);
            } else {
                console.error('Login failed:', result.error);
            }
        } catch (err) {
            console.error('Fatal error during login:', err);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
                    Redemption
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Faça login para gerenciar sua célula
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-md border border-slate-300 py-1.5 text-slate-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                Senha
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-md border border-slate-300 py-1.5 text-slate-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Inactive Church Modal */}
            {showInactiveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                Igreja Desativada
                            </h3>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6">
                            <p className="text-gray-600 text-center mb-4">
                                O acesso à sua igreja foi <strong>temporariamente suspenso</strong>.
                            </p>
                            <p className="text-gray-500 text-sm text-center mb-2">
                                Para reativar o acesso, entre em contato com o administrador do sistema.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setShowInactiveModal(false)}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

