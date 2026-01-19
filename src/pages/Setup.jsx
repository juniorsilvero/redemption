import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Building2, Key, Copy, Check, Shield, ChevronDown, ChevronUp, Trash2, List, Power } from 'lucide-react';

// Secret superadmin password - CHANGE THIS TO YOUR OWN SECRET
const SUPERADMIN_PASSWORD = 'redemption2026';

export default function Setup() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [churchName, setChurchName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [copied, setCopied] = useState(false);
    const [selectedChurch, setSelectedChurch] = useState(null);
    const queryClient = useQueryClient();

    // Fetch all churches
    const { data: churches } = useQuery({
        queryKey: ['all_churches'],
        queryFn: async () => {
            const { data } = await supabase.from('churches').select('*').order('created_at', { ascending: false });
            return data || [];
        },
        enabled: isAuthenticated
    });

    const handleAuth = (e) => {
        e.preventDefault();
        if (password === SUPERADMIN_PASSWORD) {
            setIsAuthenticated(true);
            toast.success('Acesso autorizado!');
        } else {
            toast.error('Senha incorreta');
        }
    };

    const generateCredentials = (churchName) => {
        const slug = churchName.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]/g, '');
        return {
            email: `${slug}@redemption.com`,
            password: `${slug}Admin2026!`
        };
    };

    const handleCreateChurch = async (e) => {
        e.preventDefault();
        if (!churchName.trim()) {
            toast.error('Nome da igreja é obrigatório');
            return;
        }

        setIsCreating(true);
        try {
            // Generate credentials
            const creds = generateCredentials(churchName);

            // Generate slug from church name
            const slug = churchName.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');

            // 1. Create church
            const { data: church, error: churchError } = await supabase
                .from('churches')
                .insert({
                    name: churchName,
                    slug: slug,  // Required field
                    admin_email: creds.email  // Required field
                })
                .select()
                .single();

            if (churchError) throw churchError;

            // 2. Create admin user for this church
            const { error: userError } = await supabase
                .from('users')
                .insert({
                    email: creds.email,
                    password: creds.password,
                    role: 'admin',
                    church_id: church.id,
                    user_metadata: { name: 'Administrador' }
                });

            if (userError) throw userError;

            setGeneratedCredentials({
                churchId: church.id,
                churchName: churchName,
                ...creds
            });

            toast.success('Igreja criada com sucesso!');
            setChurchName('');
            queryClient.invalidateQueries(['all_churches']);  // Refresh churches list

        } catch (error) {
            console.error(error);
            toast.error(`Erro: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = () => {
        const text = `🏛️ Igreja: ${generatedCredentials.churchName}

📧 Email: ${generatedCredentials.email}
🔑 Senha: ${generatedCredentials.password}

Acesse: ${window.location.origin}/login`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Credenciais copiadas!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Authentication screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-white text-xl">Acesso Restrito</CardTitle>
                        <p className="text-slate-400 text-sm mt-2">Esta página é apenas para o administrador do sistema.</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Senha de Superadmin</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Digite a senha secreta"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
                            >
                                Acessar
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Setup screen
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Setup de Igreja</h1>
                    <p className="text-slate-400 mt-2">Crie uma nova igreja e gere credenciais de admin automaticamente.</p>
                </div>

                {/* Create Church Form */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-400" />
                            Nova Igreja
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateChurch} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nome da Igreja</label>
                                <input
                                    type="text"
                                    value={churchName}
                                    onChange={(e) => setChurchName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Ex: Igreja Batista Central"
                                    required
                                />
                            </div>
                            {churchName && (
                                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                                    <p className="text-xs text-slate-400 mb-2">Credenciais que serão geradas:</p>
                                    <p className="text-sm text-slate-300">📧 {generateCredentials(churchName).email}</p>
                                    <p className="text-sm text-slate-300">🔑 {generateCredentials(churchName).password}</p>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                            >
                                {isCreating ? 'Criando...' : 'Criar Igreja e Admin'}
                            </button>
                        </form>
                    </CardContent>
                </Card>

                {/* Generated Credentials */}
                {generatedCredentials && (
                    <Card className="bg-green-900/30 border-green-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                ✅ Credenciais Geradas com Sucesso!
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 space-y-3">
                                <div>
                                    <p className="text-slate-400 text-xs">Igreja:</p>
                                    <p className="text-white font-bold text-lg">{generatedCredentials.churchName}</p>
                                </div>

                                <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                                    <div>
                                        <p className="text-slate-400 text-xs">📧 Email:</p>
                                        <p className="text-green-400 font-mono">{generatedCredentials.email}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedCredentials.email);
                                            toast.success('Email copiado!');
                                        }}
                                        className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                        title="Copiar email"
                                    >
                                        <Copy className="w-4 h-4 text-white" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                                    <div>
                                        <p className="text-slate-400 text-xs">🔑 Senha:</p>
                                        <p className="text-green-400 font-mono">{generatedCredentials.password}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedCredentials.password);
                                            toast.success('Senha copiada!');
                                        }}
                                        className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                        title="Copiar senha"
                                    >
                                        <Copy className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleCopy}
                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-lg"
                            >
                                {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                                {copied ? '✅ Copiado!' : '📋 Copiar Tudo (Email + Senha)'}
                            </button>

                            <p className="text-xs text-slate-500 text-center">
                                Acesse {window.location.origin}/login para fazer login
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Churches List */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <List className="w-5 h-5 text-indigo-400" />
                            Igrejas Cadastradas ({churches?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {churches?.length === 0 ? (
                            <p className="text-slate-400 text-center py-4">Nenhuma igreja cadastrada ainda.</p>
                        ) : (
                            <div className="space-y-2">
                                {churches?.map(church => {
                                    const creds = generateCredentials(church.name);
                                    const isSelected = selectedChurch === church.id;

                                    return (
                                        <div key={church.id} className={`rounded-lg overflow-hidden ${church.is_active !== false ? 'bg-slate-700/50' : 'bg-slate-700/30 border border-red-900/50'}`}>
                                            <button
                                                onClick={() => setSelectedChurch(isSelected ? null : church.id)}
                                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-600/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Building2 className={`w-5 h-5 ${church.is_active !== false ? 'text-indigo-400' : 'text-red-400'}`} />
                                                    <span className={`font-medium ${church.is_active !== false ? 'text-white' : 'text-slate-400'}`}>{church.name}</span>
                                                    {church.is_active === false && (
                                                        <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-400 rounded-full">Desativada</span>
                                                    )}
                                                </div>
                                                {isSelected ? (
                                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                                )}
                                            </button>

                                            {isSelected && (
                                                <div className="px-4 pb-4 space-y-3 border-t border-slate-600">
                                                    <div className="pt-3">
                                                        <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg mb-2">
                                                            <div>
                                                                <p className="text-slate-400 text-xs">📧 Email:</p>
                                                                <p className="text-green-400 font-mono">{creds.email}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(creds.email);
                                                                    toast.success('Email copiado!');
                                                                }}
                                                                className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                                            >
                                                                <Copy className="w-4 h-4 text-white" />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg mb-3">
                                                            <div>
                                                                <p className="text-slate-400 text-xs">🔑 Senha:</p>
                                                                <p className="text-green-400 font-mono">{creds.password}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(creds.password);
                                                                    toast.success('Senha copiada!');
                                                                }}
                                                                className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                                            >
                                                                <Copy className="w-4 h-4 text-white" />
                                                            </button>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const text = `🏛️ ${church.name}\n📧 ${creds.email}\n🔑 ${creds.password}`;
                                                                    navigator.clipboard.writeText(text);
                                                                    toast.success('Credenciais copiadas!');
                                                                }}
                                                                className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                                Copiar Tudo
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const newStatus = !church.is_active;
                                                                    const { error } = await supabase.from('churches').update({ is_active: newStatus }).eq('id', church.id);
                                                                    if (error) {
                                                                        toast.error('Erro ao alterar status: ' + error.message);
                                                                    } else {
                                                                        toast.success(newStatus ? 'Igreja ativada!' : 'Igreja desativada!');
                                                                        queryClient.invalidateQueries(['all_churches']);
                                                                    }
                                                                }}
                                                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${church.is_active !== false ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                                                                title={church.is_active !== false ? 'Desativar igreja' : 'Ativar igreja'}
                                                            >
                                                                <Power className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm(`Tem certeza que deseja excluir "${church.name}"? Todos os dados serão perdidos!`)) return;

                                                                    const { error } = await supabase.from('churches').delete().eq('id', church.id);
                                                                    if (error) {
                                                                        toast.error('Erro ao excluir: ' + error.message);
                                                                    } else {
                                                                        toast.success('Igreja excluída!');
                                                                        queryClient.invalidateQueries(['all_churches']);
                                                                        setSelectedChurch(null);
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
