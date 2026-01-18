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

    const value = {
        genderFilter,
        setGenderFilter,
    };

    return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
    return useContext(FilterContext);
};
