import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, ArrowLeft, Check, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Expenses() {
    const { churchId } = useAuth();
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Expenses
    const { data: expenses, isLoading } = useQuery({
        queryKey: ['fixed_expenses', churchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fixed_expenses')
                .select('*')
                .eq('church_id', churchId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!churchId
    });

    // Add Expense
    const addExpenseMutation = useMutation({
        mutationFn: async ({ name, amount }) => {
            return supabase.from('fixed_expenses').insert({
                church_id: churchId,
                name,
                amount: parseFloat(amount),
                is_paid: false
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fixed_expenses', churchId]);
            setNewName('');
            setNewAmount('');
            setIsSubmitting(false);
            toast.success('Despesa adicionada!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Erro ao adicionar.');
            setIsSubmitting(false);
        }
    });

    // Toggle Paid Status
    const toggleExpenseMutation = useMutation({
        mutationFn: async ({ id, isPaid }) => {
            return supabase.from('fixed_expenses').update({ is_paid: !isPaid }).eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fixed_expenses', churchId]);
        },
        onError: () => toast.error('Erro ao atualizar.')
    });

    // Delete Expense
    const deleteExpenseMutation = useMutation({
        mutationFn: async (id) => {
            return supabase.from('fixed_expenses').delete().eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fixed_expenses', churchId]);
            toast.success('Despesa removida.');
        },
        onError: () => toast.error('Erro ao remover.')
    });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newName || !newAmount) return;
        setIsSubmitting(true);
        addExpenseMutation.mutate({ name: newName, amount: newAmount });
    };

    const totalAmount = expenses?.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0;
    const totalPaid = expenses?.filter(e => e.is_paid).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Despesas Fixas</h1>
                    <p className="text-slate-500 text-sm">Gerencie os custos recorrentes.</p>
                </div>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Total Previsto</span>
                        <div className="text-xl font-bold text-slate-900 mt-1">
                            R$ {totalAmount.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Total Pago</span>
                        <div className="text-xl font-bold text-emerald-600 mt-1">
                            R$ {totalPaid.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Input Form */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4">
                    <form onSubmit={handleAdd} className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-slate-500 ml-1 mb-1 block">Nome da Despesa</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ex: Conta de Luz"
                                className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="w-28">
                            <label className="text-xs font-medium text-slate-500 ml-1 mb-1 block">Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newAmount}
                                onChange={e => setNewAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !newName || !newAmount}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </form>
                </CardContent>
            </Card>

            {/* List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-400">Carregando...</div>
                ) : expenses?.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">Nenhuma despesa cadastrada.</div>
                ) : (
                    expenses.map(expense => (
                        <div
                            key={expense.id}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border transition-all",
                                expense.is_paid
                                    ? "bg-emerald-50/50 border-emerald-100 opacity-60"
                                    : "bg-white border-slate-200"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => toggleExpenseMutation.mutate({ id: expense.id, isPaid: expense.is_paid })}
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                        expense.is_paid
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "border-slate-300 hover:border-indigo-500"
                                    )}
                                >
                                    {expense.is_paid && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                    <p className={cn("font-medium text-sm", expense.is_paid ? "text-slate-500 line-through" : "text-slate-900")}>
                                        {expense.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        R$ {expense.amount.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => deleteExpenseMutation.mutate(expense.id)}
                                className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
