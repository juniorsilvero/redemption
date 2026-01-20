// Seed Script for Gp BC Church Simulation Data
// Run with: node scripts/seedSimulation.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xwmjvnsqjvzaecpfxjlz.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('Please set VITE_SUPABASE_ANON_KEY environment variable');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CHURCH_ID = '56373f6a-26b3-4e2b-a63b-f422ad0ca52d';

const maleCells = [
    { name: 'Leões de Judá', color: '#3B82F6' },
    { name: 'Guerreiros do Rei', color: '#10B981' },
    { name: 'Filhos da Promessa', color: '#F59E0B' },
    { name: 'Exército de Deus', color: '#EF4444' },
    { name: 'Sal da Terra', color: '#8B5CF6' },
    { name: 'Luz do Mundo', color: '#06B6D4' },
    { name: 'Fortaleza', color: '#84CC16' },
    { name: 'Rocha Firme', color: '#F97316' },
    { name: 'Águias Renovadas', color: '#14B8A6' },
];

const femaleCells = [
    { name: 'Mulheres de Valor', color: '#EC4899' },
    { name: 'Rosas de Saron', color: '#F472B6' },
    { name: 'Princesas do Rei', color: '#A855F7' },
    { name: 'Ester', color: '#D946EF' },
    { name: 'Debora', color: '#F43F5E' },
    { name: 'Miriã', color: '#FB7185' },
    { name: 'Ana', color: '#E879F9' },
    { name: 'Sara', color: '#C084FC' },
    { name: 'Raquel', color: '#818CF8' },
];

const maleNames = ['Pedro', 'Lucas', 'Mateus', 'João', 'Tiago', 'André', 'Felipe', 'Daniel', 'Samuel', 'Davi', 'Paulo', 'Marcos', 'Gabriel', 'Rafael', 'Miguel', 'Thiago', 'Bruno', 'Carlos', 'Eduardo', 'Fernando'];
const femaleNames = ['Maria', 'Ana', 'Joana', 'Marta', 'Sara', 'Rebeca', 'Raquel', 'Ester', 'Débora', 'Juliana', 'Fernanda', 'Patricia', 'Camila', 'Amanda', 'Carolina', 'Beatriz', 'Larissa', 'Letícia', 'Gabriela', 'Daniela'];
const surnames = ['Santos', 'Oliveira', 'Silva', 'Costa', 'Pereira', 'Almeida', 'Ferreira', 'Rodrigues', 'Gomes', 'Martins', 'Souza', 'Lima', 'Carvalho', 'Ribeiro', 'Fernandes'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomAge() { return Math.floor(Math.random() * 40) + 18; }

async function seed() {
    console.log('🚀 Starting seed for Gp BC...');

    // 1. Create Cells
    console.log('📦 Creating cells...');
    const cellsToInsert = [
        ...maleCells.map(c => ({ church_id: CHURCH_ID, name: c.name, gender: 'male', card_color: c.color })),
        ...femaleCells.map(c => ({ church_id: CHURCH_ID, name: c.name, gender: 'female', card_color: c.color })),
    ];
    const { data: insertedCells, error: cellError } = await supabase.from('cells').insert(cellsToInsert).select();
    if (cellError) { console.error('Cell error:', cellError); return; }
    console.log(`✅ Created ${insertedCells.length} cells`);

    const maleCellIds = insertedCells.filter(c => c.gender === 'male').map(c => c.id);
    const femaleCellIds = insertedCells.filter(c => c.gender === 'female').map(c => c.id);

    // 2. Create Workers
    console.log('👷 Creating workers...');
    const workers = [];
    for (let i = 0; i < 100; i++) {
        workers.push({
            church_id: CHURCH_ID, cell_id: maleCellIds[i % maleCellIds.length],
            name: randomItem(maleNames), surname: randomItem(surnames),
            phone: `(47) 9990${i.toString().padStart(2, '0')}-${(1000 + i)}`,
            payment_status: i < 10 ? 'pending' : 'paid', payment_amount: 170.00, is_room_leader: i % 11 === 0,
        });
    }
    for (let i = 0; i < 100; i++) {
        workers.push({
            church_id: CHURCH_ID, cell_id: femaleCellIds[i % femaleCellIds.length],
            name: randomItem(femaleNames), surname: randomItem(surnames),
            phone: `(47) 9980${i.toString().padStart(2, '0')}-${(1000 + i)}`,
            payment_status: i < 10 ? 'pending' : 'paid', payment_amount: 170.00, is_room_leader: i % 11 === 0,
        });
    }
    const { data: insertedWorkers, error: workerError } = await supabase.from('workers').insert(workers).select();
    if (workerError) { console.error('Worker error:', workerError); return; }
    console.log(`✅ Created ${insertedWorkers.length} workers`);

    const maleWorkerIds = insertedWorkers.filter((_, i) => i < 100).map(w => w.id);

    // 3. Create Rooms
    console.log('🛏️ Creating rooms...');
    const rooms = [];
    for (let i = 1; i <= 10; i++) {
        rooms.push({ church_id: CHURCH_ID, name: `Quarto Masculino ${i}`, capacity: 25, gender: 'male', room_leader_ids: [maleWorkerIds[(i - 1) % maleWorkerIds.length]] });
        rooms.push({ church_id: CHURCH_ID, name: `Quarto Feminino ${i}`, capacity: 25, gender: 'female', room_leader_ids: [] });
    }
    const { data: insertedRooms, error: roomError } = await supabase.from('rooms').insert(rooms).select();
    if (roomError) { console.error('Room error:', roomError); return; }
    console.log(`✅ Created ${insertedRooms.length} rooms`);

    const maleRoomIds = insertedRooms.filter(r => r.gender === 'male').map(r => r.id);
    const femaleRoomIds = insertedRooms.filter(r => r.gender === 'female').map(r => r.id);

    // 4. Create Passers
    console.log('🚶 Creating passers...');
    const passers = [];
    for (let i = 0; i < 200; i++) {
        passers.push({
            church_id: CHURCH_ID, cell_id: maleCellIds[i % maleCellIds.length],
            name: randomItem(maleNames), surname: randomItem(surnames),
            phone: `(47) 9970${i.toString().padStart(3, '0')}-${(1000 + i)}`, age: randomAge(),
            payment_status: i < 24 ? 'pending' : 'paid', payment_amount: 290.00,
            room_id: i < 180 ? maleRoomIds[i % maleRoomIds.length] : null,
            responsible_worker_id: maleWorkerIds[i % maleWorkerIds.length],
        });
    }
    for (let i = 0; i < 200; i++) {
        passers.push({
            church_id: CHURCH_ID, cell_id: femaleCellIds[i % femaleCellIds.length],
            name: randomItem(femaleNames), surname: randomItem(surnames),
            phone: `(47) 9960${i.toString().padStart(3, '0')}-${(1000 + i)}`, age: randomAge(),
            payment_status: i < 24 ? 'pending' : 'paid', payment_amount: 290.00,
            room_id: i < 180 ? femaleRoomIds[i % femaleRoomIds.length] : null,
            responsible_worker_id: insertedWorkers[100 + (i % 100)].id,
        });
    }
    const { error: passerError } = await supabase.from('passers').insert(passers);
    if (passerError) { console.error('Passer error:', passerError); return; }
    console.log(`✅ Created 400 passers`);

    // 5. Create Service Areas
    console.log('📋 Creating service areas...');
    const areas = [
        { church_id: CHURCH_ID, name: 'Cozinha', required_workers: 15 },
        { church_id: CHURCH_ID, name: 'Limpeza', required_workers: 10 },
        { church_id: CHURCH_ID, name: 'Segurança', required_workers: 8 },
        { church_id: CHURCH_ID, name: 'Recepção', required_workers: 6 },
    ];
    const { error: areaError } = await supabase.from('service_areas').insert(areas);
    if (areaError) { console.error('Area error:', areaError); return; }
    console.log(`✅ Created service areas`);

    console.log('🎉 Seed complete!');
}

seed().catch(console.error);
