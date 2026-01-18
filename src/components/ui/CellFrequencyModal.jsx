import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Calendar, Users, Building2 } from 'lucide-react';

export function CellFrequencyModal({ isOpen, onClose, cell, churchId }) {
    const queryClient = useQueryClient();
    const [mainDate, setMainDate] = useState('');
    const [mainCount, setMainCount] = useState('');

    const [supportName, setSupportName] = useState('');
    const [supportDate, setSupportDate] = useState('');
    const [supportCount, setSupportCount] = useState('');

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
            setSupportDate('');
            setSupportCount('');
            // Keep supportName for convencience if adding multiple dates, or clear it? Clearning for now.
            // setSupportName(''); 
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

    const handleAddMain = (e) => {
        e.preventDefault();
        if (!mainDate || !mainCount) return;
        addReportMutation.mutate({
            target_name: cell.name,
            date: mainDate,
            count: parseInt(mainCount)
        });
    };

    const handleAddSupport = (e) => {
        e.preventDefault();
        if (!supportName || !supportDate || !supportCount) return;
        addReportMutation.mutate({
            target_name: supportName,
            date: supportDate,
            count: parseInt(supportCount)
        });
    };

    const mainReports = reports?.filter(r => r.target_name === cell?.name) || [];
    const supportReports = reports?.filter(r => r.target_name !== cell?.name) || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Frequência da Célula">
            <div className="space-y-8 max-h-[70vh] overflow-y-auto p-1">

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
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-orange-100 pt-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        <h3 className="text-lg font-bold text-slate-800">Células de Apoio</h3>
                    </div>

                    <form onSubmit={handleAddSupport} className="flex flex-col sm:flex-row sm:items-end gap-3 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                        <div className="w-full sm:flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Nome da Célula de Apoio</label>
                            <input
                                type="text"
                                value={supportName}
                                onChange={(e) => setSupportName(e.target.value)}
                                placeholder="Ex: Célula Apoio Jovem"
                                className="w-full text-sm rounded-md border-slate-300 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                                required
                            />
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="flex-1 sm:w-auto">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={supportDate}
                                    onChange={(e) => setSupportDate(e.target.value)}
                                    className="w-full text-sm rounded-md border-slate-300 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                                    required
                                />
                            </div>
                            <div className="w-20 sm:w-16">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Qtd.</label>
                                <input
                                    type="number"
                                    value={supportCount}
                                    onChange={(e) => setSupportCount(e.target.value)}
                                    min="0"
                                    className="w-full text-sm rounded-md border-slate-300 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full sm:w-auto bg-orange-600 text-white p-2 rounded-md hover:bg-orange-700 shadow-sm transition-colors flex justify-center items-center">
                            <Plus className="w-4 h-4" /> <span className="sm:hidden ml-2 text-sm font-medium">Adicionar</span>
                        </button>
                    </form>

                    <div className="rounded-md border border-slate-200 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Nome</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Data</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Pessoas</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {supportReports.map(report => (
                                    <tr key={report.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-sm text-slate-900 font-medium whitespace-nowrap">{report.target_name}</td>
                                        <td className="px-4 py-2 text-sm text-slate-600 whitespace-nowrap">{new Date(report.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900 font-semibold">{report.count}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button onClick={() => deleteReportMutation.mutate(report.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {supportReports.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-4 text-center text-sm text-slate-400 italic">Nenhum registro de apoio encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </Modal>
    );
}
