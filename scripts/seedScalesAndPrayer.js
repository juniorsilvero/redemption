// Seed Scale and Prayer Clock for Gp BC
// Run with: node scripts/seedScalesAndPrayer.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CHURCH_ID = '56373f6a-26b3-4e2b-a63b-f422ad0ca52d';

async function seed() {
    console.log('🚀 Adding scales and prayer clock for Gp BC...');

    // Get workers from Gp BC
    const { data: workers, error: wErr } = await supabase.from('workers').select('*').eq('church_id', CHURCH_ID);
    if (wErr) { console.error('Worker fetch error:', wErr); return; }
    console.log(`📥 Found ${workers.length} workers`);

    const maleWorkers = workers.filter(w => {
        // Filter male workers by checking if cell is male (we'll get cells)
        return true; // We'll filter by index
    }).slice(0, 100); // First 100 are male

    const femaleWorkers = workers.slice(100, 200);

    // Get or create service areas
    let { data: areas } = await supabase.from('service_areas').select('*').eq('church_id', CHURCH_ID);

    if (!areas || areas.length === 0) {
        console.log('📋 Creating service areas...');
        const newAreas = [
            { church_id: CHURCH_ID, name: 'Cozinha', required_people: 15 },
            { church_id: CHURCH_ID, name: 'Limpeza', required_people: 10 },
            { church_id: CHURCH_ID, name: 'Segurança', required_people: 8 },
            { church_id: CHURCH_ID, name: 'Recepção', required_people: 6 },
        ];
        const { data: insertedAreas, error: areaErr } = await supabase.from('service_areas').insert(newAreas).select();
        if (areaErr) { console.error('Area error:', areaErr); return; }
        areas = insertedAreas;
        console.log(`✅ Created ${areas.length} service areas`);
    } else {
        console.log(`📋 Found ${areas.length} existing service areas`);
    }

    // Create Work Scales
    console.log('⚙️ Creating work scales...');
    const days = ['Friday', 'Saturday', 'Sunday'];
    const periods = { Friday: ['Dinner'], Saturday: ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'], Sunday: ['Breakfast', 'Lunch'] };

    const scales = [];
    let workerIdx = 0;

    for (const area of areas) {
        for (const day of days) {
            for (const period of periods[day]) {
                // Assign 2-3 workers per slot
                for (let i = 0; i < 2; i++) {
                    const worker = maleWorkers[workerIdx % maleWorkers.length];
                    if (worker) {
                        scales.push({ church_id: CHURCH_ID, area_id: area.id, worker_id: worker.id, day, period });
                        workerIdx++;
                    }
                }
            }
        }
    }

    const { error: scaleErr } = await supabase.from('work_scale').insert(scales);
    if (scaleErr) { console.error('Scale error:', scaleErr); }
    else console.log(`✅ Created ${scales.length} work scale assignments`);

    // Create Prayer Clock
    console.log('🙏 Creating prayer clock...');
    const prayerSlots = [];

    // 49 slots total (Friday 19:00 to Sunday 19:00)
    const slotDays = ['Sexta', 'Sábado', 'Domingo'];
    let slotIdx = 0;
    let prayerWorkerIdx = 0;

    for (let i = 0; i < 49; i++) {
        const dayIndex = i < 5 ? 0 : (i < 29 ? 1 : 2);
        const hour = (19 + i) % 24;
        const day = slotDays[dayIndex];
        const time = `${hour.toString().padStart(2, '0')}:00`;

        const worker1 = maleWorkers[prayerWorkerIdx % maleWorkers.length];
        const worker2 = femaleWorkers[prayerWorkerIdx % femaleWorkers.length];

        prayerSlots.push({
            id: `slot-${i}`,
            church_id: CHURCH_ID,
            worker_1_id: worker1?.id || null,
            worker_2_id: worker2?.id || null,
            start_time: `2026-01-24T${time}:00`,
            end_time: `2026-01-24T${hour + 1 < 24 ? (hour + 1).toString().padStart(2, '0') : '00'}:00:00`,
        });
        prayerWorkerIdx++;
    }

    const { error: prayerErr } = await supabase.from('prayer_clock').upsert(prayerSlots, { onConflict: 'id' });
    if (prayerErr) { console.error('Prayer error:', prayerErr); }
    else console.log(`✅ Created ${prayerSlots.length} prayer clock slots`);

    console.log('🎉 Scales and prayer clock complete!');
}

seed().catch(console.error);
