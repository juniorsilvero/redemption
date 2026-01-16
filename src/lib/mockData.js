export const MOCK_USERS = [
    {
        id: 'user-admin-1',
        email: 'admin@redemption.com',
        password: 'password', // Plain text for mock only
        role: 'admin',
        church_id: 'church-1',
        user_metadata: { name: 'Admin User' }
    },
    {
        id: 'user-leader-1',
        email: 'leader@redemption.com',
        password: 'password',
        role: 'leader',
        church_id: 'church-1',
        user_metadata: { name: 'Leader User' }
    }
];

export const MOCK_CELLS = [
    {
        id: 'cell-1',
        name: 'Águias de Cristo',
        leader_id: 'user-leader-1',
        card_color: '#4ade80', // green-400
        church_id: 'church-1'
    },
    {
        id: 'cell-2',
        name: 'Leão de Judá',
        leader_id: 'user-admin-1', // admin can also lead
        card_color: '#f87171', // red-400
        church_id: 'church-1'
    }
];

export const MOCK_WORKERS = [
    { id: 'worker-1', name: 'João', surname: 'Silva', phone: '11999999999', cell_id: 'cell-1', payment_status: 'paid', payment_amount: 170.00, is_room_leader: true, church_id: 'church-1', photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { id: 'worker-2', name: 'Maria', surname: 'Oliveira', phone: '11888888888', cell_id: 'cell-2', payment_status: 'pending', payment_amount: 170.00, is_room_leader: false, church_id: 'church-1', photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { id: 'worker-3', name: 'Carlos', surname: 'Santos', phone: '11777777777', cell_id: 'cell-3', payment_status: 'paid', payment_amount: 170.00, is_room_leader: false, church_id: 'church-1', photo_url: '' },
];

export const MOCK_PASSERS = [
    {
        id: 'passer-1',
        name: 'Lucas',
        surname: 'Mendes',
        phone: '11666666666',
        cell_id: 'cell-1',
        payment_status: 'pending',
        payment_amount: 290.00,
        room_id: null,
        church_id: 'church-1'
    }
];

export const MOCK_SERVICE_AREAS = [
    { id: 'area-1', name: 'Dishwashing', required_people: 2, church_id: 'church-1' },
    { id: 'area-2', name: 'Kitchen Cleaning', required_people: 3, church_id: 'church-1' },
    { id: 'area-3', name: 'Temple Organization', required_people: 4, church_id: 'church-1' },
    { id: 'area-4', name: 'Bathroom Cleaning', required_people: 2, church_id: 'church-1' },
    { id: 'area-5', name: 'Cafeteria', required_people: 3, church_id: 'church-1' },
];

export const MOCK_ROOMS = [
    {
        id: 'room-1',
        name: 'Quarto 1 (Masculino)',
        capacity: 10,
        gender: 'male',
        room_leader_ids: ['worker-1'],
        church_id: 'church-1'
    },
    {
        id: 'room-2',
        name: 'Quarto 2 (Feminino)',
        capacity: 10,
        gender: 'female',
        room_leader_ids: [],
        church_id: 'church-1'
    }
];

// Initial WorkScale and PrayerClock can be empty
