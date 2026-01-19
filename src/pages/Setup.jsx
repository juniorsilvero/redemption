import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Building2, Key, Copy, Check, Shield } from 'lucide-react';

// Secret superadmin password - CHANGE THIS TO YOUR OWN SECRET
const SUPERADMIN_PASSWORD = 'redemption2026';

export default function Setup() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [churchName, setChurchName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [copied, setCopied] = useState(false);

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
            email: `admin@${slug}.church`,
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

            // 1. Create church
            const { data: church, error: churchError } = await supabase
                .from('churches')
                .insert({ name: churchName })
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
                                Credenciais Geradas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 font-mono text-sm">
                                <p className="text-slate-400">Igreja:</p>
                                <p className="text-white font-bold">{generatedCredentials.churchName}</p>
                                <p className="text-slate-400 mt-3">Email:</p>
                                <p className="text-green-400">{generatedCredentials.email}</p>
                                <p className="text-slate-400 mt-3">Senha:</p>
                                <p className="text-green-400">{generatedCredentials.password}</p>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copied ? 'Copiado!' : 'Copiar Credenciais'}
                            </button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
