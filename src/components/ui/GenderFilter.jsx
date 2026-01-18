import { Users, UserCircle, UserCircle2 } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { cn } from '../../lib/utils';
import { useLocation } from 'react-router-dom';

export function GenderFilter() {
    const { genderFilter, setGenderFilter } = useFilter();
    const location = useLocation();

    // Hide 'All' option specifically on these pages
    const hideAll = ['/prayer', '/scales', '/accommodation', '/settings'].includes(location.pathname);

    const options = [
        { value: 'all', label: 'Todas', icon: Users },
        { value: 'male', label: 'Homens', icon: UserCircle },
        { value: 'female', label: 'Mulheres', icon: UserCircle2 },
    ];

    const displayedOptions = hideAll ? options.filter(o => o.value !== 'all') : options;

    return (
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
            {displayedOptions.map(({ value, label, icon: Icon }) => (
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
