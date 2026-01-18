import { createContext, useContext, useEffect, useState } from 'react';

const FilterContext = createContext({});

export const FilterProvider = ({ children }) => {
    const [genderFilter, setGenderFilter] = useState(() => {
        // Load from localStorage on init
        const stored = localStorage.getItem('redemption_gender_filter');
        return stored || 'all';
    });

    useEffect(() => {
        // Persist to localStorage whenever it changes
        localStorage.setItem('redemption_gender_filter', genderFilter);
    }, [genderFilter]);

    const matchesFilter = (gender) => {
        if (genderFilter === 'all') return true;
        if (!gender) return false; // Strict: if no gender, hide when filtering
        return gender === genderFilter;
    };

    const value = {
        genderFilter,
        setGenderFilter,
        matchesFilter
    };

    return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
    return useContext(FilterContext);
};
