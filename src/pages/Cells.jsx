import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Link } from 'react-router-dom';
import { Plus, Users, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Cells() {
    const { user, isAdmin, churchId } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCell, setEditingCell] = useState(null);

    const { data: cells, isLoading } = useQuery({
        queryKey: ['cells', churchId],
        queryFn: async () => {
            let query = supabase.from('cells').select('*').eq('church_id', churchId);

            // If not admin, only show own cell
            if (!isAdmin) {
                const result = await query.eq('leader_id', user.id);
                return result.data;
            }

            const result = await query;
            return result.data;
        },
        enabled: !!churchId
    });

    const { data: cellStats } = useQuery({
        queryKey: ['cellStats', churchId],
        queryFn: async () => {
            const { data: workers } = await supabase.from('workers').select('id, cell_id').eq('church_id', churchId);
            const { data: passers } = await supabase.from('passers').select('id, cell_id').eq('church_id', churchId);

            const stats = {};
            (workers || []).forEach(w => {
                if (!stats[w.cell_id]) stats[w.cell_id] = { workers: 0, passers: 0 };
                stats[w.cell_id].workers++;
            });
            (passers || []).forEach(p => {
                if (!stats[p.cell_id]) stats[p.cell_id] = { workers: 0, passers: 0 };
                stats[p.cell_id].passers++;
            });
            return stats;
        },
        enabled: !!churchId
    });


    const { data: profiles } = useQuery({

        queryKey: ['profiles'],
        queryFn: async () => {
            const { data } = await supabase.from('users').select('*');
            return data;
        }
    });

    // Helper to get Leader Name
    const getLeaderName = (leaderId) => {
        const profile = profiles?.find(p => p.id === leaderId);
        return profile?.user_metadata?.name || profile?.email || 'Desconhecido';
    };

    // Mutations
    const cellMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                const { data: result, error } = await supabase.from('cells').update(data).eq('id', data.id);
                if (error) {
                    console.error('Update error:', error);
                    throw error;
                }
                return result;
            }
            const { data: result, error } = await supabase.from('cells').insert({ ...data, church_id: 'church-1' });
            if (error) {
                console.error('Insert error:', error);
                throw error;
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cells']);
            setIsModalOpen(false);
            setEditingCell(null);
            toast.success(editingCell ? 'Célula atualizada!' : 'Célula criada com sucesso!');
        },
        onError: (error) => {
            console.error('Mutation error:', error);
            toast.error(`Erro ao salvar célula: ${error.message || 'Erro desconhecido'}`);
        }
    });

    const deleteCellMutation = useMutation({
        mutationFn: async (id) => {
            // Cascade delete: Remove workers and passers associated with this cell first
            await supabase.from('workers').delete().eq('cell_id', id);
            await supabase.from('passers').delete().eq('cell_id', id);

            // Then delete the cell
            const { error } = await supabase.from('cells').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cells']);
            queryClient.invalidateQueries(['workers']); // Invalidating workers query
            queryClient.invalidateQueries(['passers']); // Invalidating passers query
            // Invalidate dashboard queries if they exist (usually reliant on workers/passers)
            queryClient.invalidateQueries(['dashboard']);

            setIsModalOpen(false);
            setEditingCell(null);
            toast.success('Célula excluída com sucesso!');
        },
        onError: () => toast.error('Erro ao excluir célula.')
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            leader_id: formData.get('leader_id'),
            card_color: formData.get('card_color'),
        };

        if (editingCell) {
            data.id = editingCell.id;
        }

        cellMutation.mutate(data);
    };

    const handleEdit = (cell, e) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();
        setEditingCell(cell);
        setIsModalOpen(true);
    };

    const PREDEFINED_CELLS = [
        { name: 'Estevão', color: '#f97316', leader: 'Thiago' }, // Laranja
        { name: 'Elias', color: '#eab308', leader: 'Eliabe' }, // Amarela
        { name: 'Atalaia', color: '#ef4444', leader: 'Wellinton' }, // Vermelha
        { name: 'Davi', color: '#8B4513', leader: 'Pablo' }, // Marrom
        { name: 'Isaque', color: '#3b82f6', leader: 'Rafael' }, // Azul
        { name: 'Kadosh', color: '#22c55e', leader: 'Eliseu' }, // Verde
        { name: 'Israel', color: '#ffffff', leader: 'Gean' }, // Branca
        { name: 'Pedro', color: '#6b7280', leader: 'Levi' }, // Cinza
        { name: 'Jeremias', color: '#000000', leader: 'Guilherme' }, // Preto
        { name: 'Débora', color: '#a855f7', leader: 'Ariane' }, // Roxa
        { name: 'Maria', color: '#f97316', leader: 'Mariana' }, // Laranja
        { name: 'Isabel', color: '#ec4899', leader: 'Jaque' }, // Rosa
        { name: 'Átrios', color: '#ef4444', leader: 'Calita' }, // Vermelha
        { name: 'Hadassa', color: '#86efac', leader: 'Kauani' }, // Verde Claro
        { name: 'Ana', color: '#3b82f6', leader: 'Lara' }, // Azul
        { name: 'Ágape', color: '#ffffff', leader: 'Rafa' }, // Branca
        { name: 'Rute', color: '#000000', leader: 'Vania' }, // Preta
    ];

    const [selectedTemplate, setSelectedTemplate] = useState('');

    const handleTemplateChange = (e) => {
        const templateName = e.target.value;
        setSelectedTemplate(templateName);

        const template = PREDEFINED_CELLS.find(c => c.name === templateName);
        if (template) {
            // Find leader if possible (fuzzy match or exact)
            const leader = profiles?.find(p => {
                const name = p.user_metadata?.name || p.email;
                return name.toLowerCase().includes(template.leader.toLowerCase());
            });

            // We need to set form values manually since we are using uncontrolled inputs with defaultValue
            // A better approach for this form would be controlled inputs, but to minimize refactor:
            const form = document.querySelector('form[data-cell-form]');
            if (form) {
                const nameInput = form.elements.namedItem('name');
                const colorInput = form.elements.namedItem('card_color');
                const leaderInput = form.elements.namedItem('leader_id');

                if (nameInput) nameInput.value = template.name;

                // For radio buttons, we need to check the right one
                if (colorInput) {
                    // It's a RadioNodeList
                    colorInput.value = template.color;
                }

                if (leaderInput && leader) {
                    leaderInput.value = leader.id;
                }
            }
        }
    };

    if (isLoading) return <div>Carregando células...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Células</h1>
                    <p className="text-slate-500">
                        {isAdmin ? 'Gerencie todas as células da igreja.' : 'Gerencie sua célula.'}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setEditingCell(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Célula
                    </button>
                )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cells?.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-slate-500">
                        Nenhuma célula encontrada.
                    </div>
                ) : (
                    cells?.map((cell) => (
                        <Link key={cell.id} to={`/cells/${cell.id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4 group relative" style={{ borderLeftColor: cell.card_color }}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-slate-500" />
                                            {cell.name}
                                        </CardTitle>
                                        {(isAdmin || user.id === cell.leader_id) && (
                                            <button
                                                onClick={(e) => handleEdit(cell, e)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                                title="Editar Célula"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-slate-500">
                                        <span className="font-semibold text-slate-700">Líder:</span> {getLeaderName(cell.leader_id)}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            <Users className="h-3 w-3" />
                                            {cellStats?.[cell.id]?.workers || 0} {(cellStats?.[cell.id]?.workers === 1) ? 'Trab.' : 'Trabs.'}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                            <UserPlus className="h-3 w-3" />
                                            {cellStats?.[cell.id]?.passers || 0} {(cellStats?.[cell.id]?.passers === 1) ? 'Passante' : 'Passantes'}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Clique para gerenciar</span>
                                    </div>

                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>


            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCell ? "Editar Célula" : "Nova Célula"}
            >
                <form onSubmit={handleSubmit} className="space-y-4" data-cell-form>

                    {!editingCell && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modelo de Célula (Pré-definido)</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                onChange={handleTemplateChange}
                                value={selectedTemplate}
                            >
                                <option value="">Selecione um modelo...</option>
                                {PREDEFINED_CELLS.map(cell => (
                                    <option key={cell.name} value={cell.name}>
                                        {cell.name} - {cell.leader}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Isso preencherá automaticamente o nome e a cor.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome da Célula</label>
                        <input name="name" defaultValue={editingCell?.name} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Líder</label>
                        <select
                            name="leader_id"
                            defaultValue={editingCell?.leader_id || user.id}
                            disabled={!isAdmin}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                            <option value={user.id}>Atribuir a mim mesmo</option>
                            {profiles?.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.user_metadata?.name || p.email}
                                </option>
                            ))}
                        </select>
                        {!isAdmin && <p className="text-xs text-slate-500 mt-1">Apenas administradores podem alterar o líder.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cor do Card</label>
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {[
                                '#f97316', // Laranja
                                '#eab308', // Amarelo
                                '#ef4444', // Vermelho
                                '#8B4513', // Marrom
                                '#3b82f6', // Azul
                                '#22c55e', // Verde
                                '#ffffff', // Branco
                                '#6b7280', // Cinza
                                '#000000', // Preto
                                '#a855f7', // Roxo
                                '#ec4899', // Rosa
                                '#86efac', // Verde Claro
                            ].map(color => (
                                <label key={color} className="cursor-pointer relative group">
                                    <input
                                        type="radio"
                                        name="card_color"
                                        value={color}
                                        defaultChecked={editingCell ? editingCell.card_color === color : color === '#f97316'}
                                        required
                                        className="sr-only peer"
                                    />
                                    <div
                                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-105 peer-checked:scale-110 ${color === '#ffffff' ? 'border-gray-300' : 'border-transparent'} peer-checked:border-slate-800`}
                                        style={{ backgroundColor: color }}
                                    ></div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button type="submit" className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:col-start-2">
                            Salvar
                        </button>
                        <div className="mt-3 sm:mt-0 sm:col-start-1 flex gap-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                Cancelar
                            </button>
                            {editingCell && isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja excluir esta célula?')) {
                                            deleteCellMutation.mutate(editingCell.id);
                                        }
                                    }}
                                    className="inline-flex justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-100"
                                    title="Excluir Célula"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
