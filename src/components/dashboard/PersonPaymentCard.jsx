import { User, Info } from 'lucide-react';

export function PersonPaymentCard({ person, type, status, cells, onInfo }) {
    const cell = person.cell || cells?.find(c => c.id === person.cell_id);
    const isPaid = status === 'paid';
    
    return (
        <div className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 border rounded-xl bg-slate-50 items-center hover:bg-white transition-colors shadow-sm">
            {/* Avatar / Photo */}
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                {person.photo_url ? (
                    <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <User className="h-5 w-5 text-slate-400" />
                )}
            </div>

            {/* Info */}
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-bold text-slate-900 truncate">{person.name} {person.surname}</p>
                    {cell && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-xs uppercase tracking-wider">
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: cell.card_color }}></span>
                            {cell.name}
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">{type}</p>
            </div>

            {/* Price & Status */}
            <div className="flex flex-col items-end shrink-0 gap-1.5">
                <div className="text-right">
                    <p className={`text-sm font-bold leading-none ${isPaid ? 'text-emerald-600' : 'text-slate-900'}`}>
                        R$ {person.payment_amount?.toFixed(2)}
                    </p>
                    <div className="flex flex-col items-end gap-1 mt-1">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tighter ring-1 ring-inset ${
                            isPaid 
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                            : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                        }`}>
                            {isPaid ? 'Pago' : 'Pendente'}
                        </span>
                        
                        {person.passers_count > 0 && (
                            <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded leading-none shrink-0 whitespace-nowrap">
                                {person.passers_count} {person.passers_count === 1 ? 'passante' : 'passantes'}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={onInfo}
                    className="p-1 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                >
                    <Info className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}
