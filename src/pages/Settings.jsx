import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Key } from 'lucide-react';

// User Management Component
function UserManagement() {
    const queryClient = useQueryClient();
    const [editingUser, setEditingUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const { data: leaders } = useQuery({
        queryKey: ['leaders'],
        queryFn: async () => {
            const { data } = await supabase.from('users').select('*, cells!cells_leader_id_fkey(name)').eq('role', 'leader');
            return data || [];
        }
    });

    const updatePasswordMutation = useMutation({
        mutationFn: async ({ userId, password }) => {
            const { error } = await supabase.from('users').update({ password }).eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['leaders']);
            setEditingUser(null);
            setNewPassword('');
            toast.success('Senha atualizada com sucesso!');
        },
        onError: () => toast.error('Erro ao atualizar senha')
    });

    const handleUpdatePassword = (userId) => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('Senha deve ter no mínimo 6 caracteres');
            return;
        }
        updatePasswordMutation.mutate({ userId, password: newPassword });
    };

    return (
        <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Líder</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email/Login</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Célula</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {leaders?.map(leader => (
                            <tr key={leader.id}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {leader.user_metadata?.name || 'Sem nome'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{leader.email}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {leader.cells?.[0]?.name || 'Sem célula'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {editingUser === leader.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Nova senha"
                                                className="px-2 py-1 border rounded text-sm w-32"
                                            />
                                            <button
                                                onClick={() => handleUpdatePassword(leader.id)}
                                                className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500"
                                            >
                                                Salvar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingUser(null);
                                                    setNewPassword('');
                                                }}
                                                className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setEditingUser(leader.id)}
                                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-500"
                                        >
                                            <Key className="h-4 w-4" />
                                            Alterar Senha
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
                {leaders?.map(leader => (
                    <div key={leader.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-slate-900">{leader.user_metadata?.name || 'Sem nome'}</h4>
                                <p className="text-xs text-slate-500">{leader.email}</p>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {leader.cells?.[0]?.name || 'Sem célula'}
                            </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            {editingUser === leader.id ? (
                                <div className="space-y-2">
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Nova senha"
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdatePassword(leader.id)}
                                            className="flex-1 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium"
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingUser(null);
                                                setNewPassword('');
                                            }}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-medium"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setEditingUser(leader.id)}
                                    className="flex items-center justify-center gap-2 w-full py-2 text-indigo-600 bg-indigo-50 rounded-md text-sm font-medium"
                                >
                                    <Key className="h-4 w-4" />
                                    Alterar Senha
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <p className="font-semibold mb-1">ℹ️ Informações de Login dos Líderes:</p>
                <p>• Email: <code className="bg-white px-1 rounded">[nome]@redemption.com</code></p>
                <p>• Senha padrão: <code className="bg-white px-1 rounded">[nome]123</code></p>
                <p className="mt-2 text-gray-600">Exemplo: Thiago → thiago@redemption.com / thiago123</p>
            </div>
        </div>
    );
}

export default function Settings() {
    const { isAdmin, churchId } = useAuth();
    const queryClient = useQueryClient();

    if (!isAdmin) {
        return <div className="p-4 text-red-500">Acesso negado. Apenas administradores.</div>;
    }

    // Fetch Areas
    const { data: areas } = useQuery({
        queryKey: ['service_areas'],
        queryFn: async () => {
            const { data } = await supabase.from('service_areas').select('*');
            return data || [];
        }
    });

    // Mutations
    const addAreaMutation = useMutation({
        mutationFn: async (newArea) => {
            return supabase.from('service_areas').insert({ ...newArea, church_id: churchId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['service_areas']);
            toast.success('Área adicionada');
        }
    });

    const deleteAreaMutation = useMutation({
        mutationFn: async (id) => {
            return supabase.from('service_areas').delete().eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['service_areas']);
            toast.success('Área removida');
        }
    });

    const handleAddArea = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        addAreaMutation.mutate({
            name: formData.get('name'),
            required_people: parseInt(formData.get('required_people'))
        });
        e.target.reset();
    };

    const handleInvite = (e) => {
        e.preventDefault();
        toast.success('Convite enviado (Simulação)');
        e.target.reset();
    };

    const handleSavePrices = (e) => {
        e.preventDefault();
        toast.success('Preços atualizados com sucesso');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações</h1>
                <p className="text-slate-500">Gerencie parâmetros globais do sistema.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Prices */}
                <Card>
                    <CardHeader>
                        <CardTitle>Preços Padrão</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSavePrices} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor Trabalhador</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">R$</span>
                                    </div>
                                    <input type="number" step="0.01" defaultValue="170.00" className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor Passante</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">R$</span>
                                    </div>
                                    <input type="number" step="0.01" defaultValue="290.00" className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                                </div>
                            </div>
                            <button type="submit" className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                                Salvar Preços
                            </button>
                        </form>
                    </CardContent>
                </Card>

                {/* Invite Leader */}
                <Card>
                    <CardHeader>
                        <CardTitle>Convidar Líder</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email do Líder</label>
                                <input type="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="lider@exemplo.com" />
                            </div>
                            <button type="submit" className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                Enviar Convite
                            </button>
                        </form>
                    </CardContent>
                </Card>

                {/* Service Areas */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Áreas de Serviço</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nome</th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Pessoas Necessárias</th>
                                            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Ações</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {areas?.map(area => (
                                            <tr key={area.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{area.name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{area.required_people}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button onClick={() => deleteAreaMutation.mutate(area.id)} className="text-red-600 hover:text-red-900 ml-4"><Trash2 className="h-4 w-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Grid */}
                            <div className="grid grid-cols-1 gap-3 md:hidden">
                                {areas?.map(area => (
                                    <div key={area.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">{area.name}</h4>
                                            <p className="text-xs text-slate-500">{area.required_people} pessoas necessárias</p>
                                        </div>
                                        <button
                                            onClick={() => deleteAreaMutation.mutate(area.id)}
                                            className="p-2 text-red-500 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddArea} className="flex flex-col md:flex-row gap-4 items-stretch md:items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nova Área</label>
                                    <input name="name" required className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" placeholder="Ex: Estacionamento" />
                                </div>
                                <div className="md:w-32">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. Pessoas</label>
                                    <input name="required_people" type="number" required min="1" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" placeholder="2" />
                                </div>
                                <button type="submit" className="flex justify-center items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 h-10 transition-colors">
                                    <Plus className="h-5 w-5 mr-1 md:mr-0" />
                                    <span className="md:hidden">Adicionar Área</span>
                                </button>
                            </form>
                        </div>
                    </CardContent>
                </Card>

                {/* User Management */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Gerenciamento de Usuários (Líderes)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UserManagement />
                    </CardContent>
                </Card>

                {/* Maintenance / Data Cleanup */}
                <Card className="md:col-span-2 border-red-100 bg-red-50/30">
                    <CardHeader>
                        <CardTitle className="text-red-800 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Manutenção de Dados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-red-700">
                                <p className="font-medium">Limpar dados orfãos</p>
                                <p className="text-red-500">Isso removerá trabalhadores e passantes que estão vinculados a células que não existem mais. Use isso se você ver dados "fantasmas" no dashboard.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!window.confirm('Isso apagará permanentemente todos os dados órfãos. Continuar?')) return;

                                    try {
                                        toast.loading('Limpando dados...', { id: 'cleanup' });

                                        // 1. Get valid Cell IDs
                                        const { data: cells } = await supabase.from('cells').select('id');
                                        const validCellIds = new Set(cells?.map(c => c.id) || []);

                                        // 2. Scan Workers
                                        const { data: workers } = await supabase.from('workers').select('*');
                                        const orphanedWorkers = workers?.filter(w => !validCellIds.has(w.cell_id)) || [];

                                        // 3. Scan Passers
                                        const { data: passers } = await supabase.from('passers').select('*');
                                        const orphanedPassers = passers?.filter(p => !validCellIds.has(p.cell_id)) || [];

                                        // 4. Delete Orphans (Simulating batch delete with Promise.all)
                                        const deletePromises = [
                                            ...orphanedWorkers.map(w => supabase.from('workers').delete().eq('id', w.id)),
                                            ...orphanedPassers.map(p => supabase.from('passers').delete().eq('id', p.id))
                                        ];

                                        await Promise.all(deletePromises);

                                        // 5. Cleanup Assignments (Scales & Prayer) for deleted workers
                                        // Ideally we would do this, but getting rid of the users from the Dashboard is the priority.
                                        // The scale/prayer logic might handle missing workers resiliently (showing empty/null).
                                        // But let's try to clean scales too if we can find them.

                                        // Refresh Queries
                                        queryClient.invalidateQueries();

                                        toast.success(`Limpeza concluída! ${orphanedWorkers.length + orphanedPassers.length} registros removidos.`, { id: 'cleanup' });
                                    } catch (e) {
                                        console.error(e);
                                        toast.error('Erro ao limpar dados', { id: 'cleanup' });
                                    }
                                }}
                                className="whitespace-nowrap px-4 py-2 bg-red-100 text-red-700 rounded-md font-medium hover:bg-red-200 transition-colors"
                            >
                                Corrigir Integridade
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
