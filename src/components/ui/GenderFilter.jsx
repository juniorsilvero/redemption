import { Users, UserCircle, UserCircle2 } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { cn } from '../../lib/utils';

export function GenderFilter() {
    const { genderFilter, setGenderFilter } = useFilter();

    const options = [
        { value: 'all', label: 'Todas', icon: Users },
        { value: 'male', label: 'Homens', icon: UserCircle },
        { value: 'female', label: 'Mulheres', icon: UserCircle2 },
    ];

    return (
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
            {options.map(({ value, label, icon: Icon }) => (
                <button
                    key={value}
                    onClick={() => setGenderFilter(value)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                        genderFilter === value
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <Icon className="w-4 h-4" />
                    {label}
                </button>
            ))}
        </div>
    );
}
