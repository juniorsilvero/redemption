import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Users, Building2, User, X } from 'lucide-react';

export function CellFrequencyModal({ isOpen, onClose, cell, churchId }) {
    const queryClient = useQueryClient();

    // Main Cell Local State
    const [mainDate, setMainDate] = useState('');
    const [mainCount, setMainCount] = useState('');

    // New Support Cell State
    const [isAddingSupport, setIsAddingSupport] = useState(false);
    const [newSupportName, setNewSupportName] = useState('');
    const [newSupportLeader, setNewSupportLeader] = useState('');

    // Per-Support Cell Form State (Record<string, { date: string, count: string }>)
    const [supportForms, setSupportForms] = useState({});

    // Fetch Support Cells
    const { data: supportCells } = useQuery({
        queryKey: ['supportCells', cell?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('support_cells')
                .select('*')
                .eq('cell_id', cell?.id)
                .order('created_at', { ascending: true });
            return data || [];
        },
        enabled: !!cell?.id && isOpen
    });

    // Fetch Reports (all reports for this cell context)
    const { data: reports } = useQuery({
        queryKey: ['cellFrequency', cell?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('cell_attendance_reports')
                .select('*')
                .eq('cell_id', cell?.id)
                .order('date', { ascending: false });
            return data || [];
        },
        enabled: !!cell?.id && isOpen
    });

    // Mutations
    const addSupportCellMutation = useMutation({
        mutationFn: async ({ name, leader }) => {
            return supabase.from('support_cells').insert({
                church_id: churchId,
                cell_id: cell.id,
                name,
                leader
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['supportCells', cell.id]);
            toast.success('Célula de apoio criada');
            setIsAddingSupport(false);
            setNewSupportName('');
            setNewSupportLeader('');
        }
    });

    const deleteSupportCellMutation = useMutation({
        mutationFn: async (id) => {
            return supabase.from('support_cells').delete().eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['supportCells', cell.id]);
            toast.success('Célula de apoio removida');
        }
    });

    const addReportMutation = useMutation({
        mutationFn: async (newReport) => {
            return supabase.from('cell_attendance_reports').insert({
                ...newReport,
                church_id: churchId,
                cell_id: cell.id
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cellFrequency', cell.id]);
            toast.success('Relatório adicionado');
            setMainDate('');
            setMainCount('');
        }
    });

    const deleteReportMutation = useMutation({
        mutationFn: async (id) => {
            return supabase.from('cell_attendance_reports').delete().eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cellFrequency', cell.id]);
            toast.success('Relatório removido');
        }
    });

    // Handlers
    const handleAddMain = (e) => {
        e.preventDefault();
        if (!mainDate || !mainCount) return;
        addReportMutation.mutate({
            target_name: cell.name,
            date: mainDate,
            count: parseInt(mainCount),
            support_cell_id: null
        });
    };

    const handleCreateSupportCell = (e) => {
        e.preventDefault();
        if (!newSupportName) return;
        addSupportCellMutation.mutate({ name: newSupportName, leader: newSupportLeader });
    }

    const handleSupportFormChange = (supportId, field, value) => {
        setSupportForms(prev => ({
            ...prev,
            [supportId]: { ...prev[supportId], [field]: value }
        }));
    };

    const handleAddSupportReport = (e, supportCell) => {
        e.preventDefault();
        const form = supportForms[supportCell.id] || { date: '', count: '' };
        if (!form.date || !form.count) return;

        addReportMutation.mutate({
            target_name: supportCell.name,
            support_cell_id: supportCell.id,
            date: form.date,
            count: parseInt(form.count)
        }, {
            onSuccess: () => {
                setSupportForms(prev => ({
                    ...prev,
                    [supportCell.id]: { date: '', count: '' }
                }));
            }
        });
    };

    // Filter reports
    // Main reports are those WITHOUT a support_cell_id
    const mainReports = reports?.filter(r => !r.support_cell_id) || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Frequência da Célula">
            <div className="space-y-8 max-h-[70vh] overflow-y-auto p-1 pr-2">

                {/* Main Cell Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-slate-800">{cell?.name}</h3>
                    </div>

                    <form onSubmit={handleAddMain} className="flex flex-col sm:flex-row sm:items-end gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="w-full sm:w-auto">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                            <input
                                type="date"
                                value={mainDate}
                                onChange={(e) => setMainDate(e.target.value)}
                                className="w-full text-sm rounded-md border-slate-300 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div className="w-full sm:w-24">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Qtd. Pessoas</label>
                            <input
                                type="number"
                                value={mainCount}
                                onChange={(e) => setMainCount(e.target.value)}
                                min="0"
                                className="w-full text-sm rounded-md border-slate-300 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full sm:w-auto bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex justify-center items-center">
                            <Plus className="w-4 h-4" /> <span className="sm:hidden ml-2 text-sm font-medium">Adicionar</span>
                        </button>
                    </form>

                    <div className="rounded-md border border-slate-200 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Data</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Pessoas</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {mainReports.map(report => (
                                    <tr key={report.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-sm text-slate-900 whitespace-nowrap">{new Date(report.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900 font-semibold">{report.count}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button onClick={() => deleteReportMutation.mutate(report.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {mainReports.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-4 text-center text-sm text-slate-400 italic">Nenhum registro encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Support Cells Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-orange-100 pt-2">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-600" />
                            <h3 className="text-lg font-bold text-slate-800">Células de Apoio</h3>
                        </div>
                        <button
                            onClick={() => setIsAddingSupport(!isAddingSupport)}
                            className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100 transition-colors"
                        >
                            {isAddingSupport ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isAddingSupport ? 'Cancelar' : 'Nova Célula de Apoio'}
                        </button>
                    </div>

                    {isAddingSupport && (
                        <form onSubmit={handleCreateSupportCell} className="bg-orange-50 p-4 rounded-lg border border-orange-200 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold text-orange-800 mb-3">Cadastrar Célula de Apoio</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Nome da Célula</label>
                                    <input
                                        type="text"
                                        value={newSupportName}
                                        onChange={(e) => setNewSupportName(e.target.value)}
                                        placeholder="Ex: Célula Betel"
                                        className="w-full text-sm rounded-md border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Líder (Opcional)</label>
                                    <input
                                        type="text"
                                        value={newSupportLeader}
                                        onChange={(e) => setNewSupportLeader(e.target.value)}
                                        placeholder="Nome do Líder"
                                        className="w-full text-sm rounded-md border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 text-sm font-medium shadow-sm">
                                    Salvar Célula
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid gap-6">
                        {supportCells?.map(supportCell => {
                            const cellReports = reports?.filter(r => r.support_cell_id === supportCell.id) || [];
                            const formState = supportForms[supportCell.id] || { date: '', count: '' };

                            return (
                                <div key={supportCell.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{supportCell.name}</h4>
                                            {supportCell.leader && (
                                                <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                                                    <User className="w-3 h-3" />
                                                    <span>{supportCell.leader}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (confirm('Tem certeza que deseja excluir esta célula de apoio e todos os seus relatórios?')) {
                                                    deleteSupportCellMutation.mutate(supportCell.id);
                                                }
                                            }}
                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                            title="Excluir Célula de Apoio"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={(e) => handleAddSupportReport(e, supportCell)} className="flex flex-col sm:flex-row sm:items-end gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                        <div className="w-full sm:w-auto">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                                            <input
                                                type="date"
                                                value={formState.date}
                                                onChange={(e) => handleSupportFormChange(supportCell.id, 'date', e.target.value)}
                                                className="w-full text-sm rounded-md border-slate-300 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                                                required
                                            />
                                        </div>
                                        <div className="w-full sm:w-24">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Qtd.</label>
                                            <input
                                                type="number"
                                                value={formState.count}
                                                onChange={(e) => handleSupportFormChange(supportCell.id, 'count', e.target.value)}
                                                min="0"
                                                className="w-full text-sm rounded-md border-slate-300 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="w-full sm:w-auto bg-orange-600 text-white p-2 rounded-md hover:bg-orange-700 shadow-sm transition-colors flex justify-center items-center">
                                            <Plus className="w-4 h-4" /> <span className="sm:hidden ml-2 text-sm font-medium">Add</span>
                                        </button>
                                    </form>

                                    <div className="rounded-md border border-slate-200 overflow-x-auto max-h-48 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {cellReports.map(report => (
                                                    <tr key={report.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2 text-sm text-slate-600 whitespace-nowrap">{new Date(report.date).toLocaleDateString('pt-BR')}</td>
                                                        <td className="px-4 py-2 text-sm text-slate-900 font-semibold">{report.count} pessoas</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button onClick={() => deleteReportMutation.mutate(report.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {cellReports.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="px-4 py-4 text-center text-sm text-slate-400 italic">Nenhum registro.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}

                        {supportCells?.length === 0 && !isAddingSupport && (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Nenhuma célula de apoio cadastrada.</p>
                                <button onClick={() => setIsAddingSupport(true)} className="text-indigo-600 font-medium text-sm mt-1 hover:underline">
                                    Cadastrar primeira
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </Modal>
    );
}
