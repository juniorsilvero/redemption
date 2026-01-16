import { MOCK_USERS, MOCK_CELLS, MOCK_WORKERS, MOCK_PASSERS, MOCK_SERVICE_AREAS, MOCK_ROOMS } from './mockData';

const STORAGE_KEY = 'redemption_mock_db';

// Initialize storage if empty
const initializeStorage = () => {
    if (!localStorage.getItem(STORAGE_KEY)) {
        const initialData = {
            users: MOCK_USERS,
            cells: MOCK_CELLS,
            workers: MOCK_WORKERS,
            passers: MOCK_PASSERS,
            service_areas: MOCK_SERVICE_AREAS,
            rooms: MOCK_ROOMS,
            work_scale: [],
            prayer_clock: []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }
};

// Helper to get data
const getDb = () => {
    initializeStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
};

// Helper to save data
const saveDb = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Mock Session
let currentSession = null;
try {
    currentSession = JSON.parse(localStorage.getItem('redemption_session'));
} catch (e) { }

export const supabase = {
    auth: {
        signInWithPassword: async ({ email, password }) => {
            const db = getDb();
            const user = db.users.find(u => u.email === email && u.password === password); // Simple mock check

            if (user) {
                const session = {
                    user,
                    access_token: 'mock-token-' + Date.now(),
                };
                currentSession = session;
                localStorage.setItem('redemption_session', JSON.stringify(session));
                return { data: { user, session }, error: null };
            }
            return { data: null, error: { message: 'Invalid login credentials' } };
        },
        signOut: async () => {
            currentSession = null;
            localStorage.removeItem('redemption_session');
            return { error: null };
        },
        getSession: async () => {
            return { data: { session: currentSession }, error: null };
        },
        onAuthStateChange: (callback) => {
            // Very basic mock implementation
            callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession);
            return { data: { subscription: { unsubscribe: () => { } } } };
        },
        getUser: async () => {
            return { data: { user: currentSession?.user || null }, error: null }
        }
    },
    from: (table) => {
        return {
            select: (query = '*') => {
                const db = getDb();
                const data = db[table] || [];

                // Return a promise-like object that allows chaining
                const promise = Promise.resolve({ data, error: null });

                // Mock filtering (very basic, only supports one level of eq for now in this mock structure)
                promise.eq = (column, value) => {
                    return Promise.resolve({
                        data: data.filter(item => item[column] === value),
                        error: null
                    });
                };

                // Mock 'in' filter
                promise.in = (column, values) => {
                    return Promise.resolve({
                        data: data.filter(item => values.includes(item[column])),
                        error: null
                    })
                }

                // Mock updates, inserts, deletes inside the chain
                return promise;
            },
            insert: (record) => {
                const db = getDb();
                const tableData = db[table] || [];
                const newRecord = { id: `${table}-${Date.now()}`, ...record }; // Auto-generate ID if not present
                if (!db[table]) db[table] = [];
                db[table].push(newRecord);
                saveDb(db);
                return Promise.resolve({ data: [newRecord], error: null });
            },
            update: (updates) => {
                return {
                    eq: (column, value) => {
                        const db = getDb();
                        let updatedItems = [];
                        if (db[table]) {
                            db[table] = db[table].map(item => {
                                if (item[column] === value) {
                                    const newItem = { ...item, ...updates };
                                    updatedItems.push(newItem);
                                    return newItem;
                                }
                                return item;
                            });
                            saveDb(db);
                        }
                        return Promise.resolve({ data: updatedItems, error: null });
                    }
                };
            },
            delete: () => {
                return {
                    eq: (column, value) => {
                        const db = getDb();
                        if (db[table]) {
                            db[table] = db[table].filter(item => item[column] !== value);
                            saveDb(db);
                        }
                        return Promise.resolve({ error: null });
                    }
                }
            }
        };
    }
};
