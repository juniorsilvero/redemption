import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

export default function Settings() {
    const { isAdmin } = useAuth();
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
            return supabase.from('service_areas').insert({ ...newArea, church_id: 'church-1' });
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
                            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nome</th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                                <span className="md:hidden">Qtd.</span>
                                                <span className="hidden md:inline">Pessoas Necessárias</span>
                                            </th>
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

                            <form onSubmit={handleAddArea} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700">Nova Área</label>
                                    <input name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="Ex: Estacionamento" />
                                </div>
                                <div className="w-32">
                                    <label className="block text-sm font-medium text-gray-700">Qtd. Pessoas</label>
                                    <input name="required_people" type="number" required min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="2" />
                                </div>
                                <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 h-10 mb-0.5">
                                    <Plus className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
