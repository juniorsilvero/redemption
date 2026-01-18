import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Global styles for all tables to ensure bold/legible text
const commonTableStyles = {
    styles: {
        fontSize: 11,
        fontStyle: 'bold',
        cellPadding: 3,
        textColor: [0, 0, 0]
    },
    headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 13,
        halign: 'center'
    },
    theme: 'grid'
};

// Helper to get title suffix
const getFilterTitle = (filter) => {
    if (filter === 'male') return ' (Homens)';
    if (filter === 'female') return ' (Mulheres)';
    return '';
};

export const generateRoomPDF = (room, leaders, occupants, cellMap) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Acomodação: ${room.name}`, 14, 20);

    doc.setFontSize(13);
    doc.text(`Gênero: ${room.gender === 'male' ? 'Masculino' : 'Feminino'} | Ocupação: ${occupants.length} / ${room.capacity}`, 14, 28);

    // Leaders Table
    doc.setFontSize(15);
    doc.text('Líderes do Quarto', 14, 40);

    const leaderData = leaders.map(l => [
        `${l.name} ${l.surname}`,
        cellMap[l.cell_id]?.name || 'Sem célula'
    ]);

    autoTable(doc, {
        ...commonTableStyles,
        startY: 45,
        head: [['Nome Completo', 'Célula']],
        body: leaderData.length > 0 ? leaderData : [['Nenhum líder atribuído', '-']],
    });

    // Passers Table
    const finalY = doc.lastAutoTable?.finalY || 45;
    doc.setFontSize(15);
    doc.text('Passantes / Ocupantes', 14, finalY + 15);

    const occupantData = occupants.map(p => [
        `${p.name} ${p.surname}`,
        cellMap[p.cell_id]?.name || 'Sem célula'
    ]);

    autoTable(doc, {
        ...commonTableStyles,
        startY: finalY + 20,
        head: [['Nome Completo', 'Célula']],
        body: occupantData.length > 0 ? occupantData : [['Nenhum passante alocado', '-']],
    });

    doc.save(`Acomodacao_${room.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateScalePDF = (activeDay, scales, areas, workers, cells, filterType) => {
    const doc = new jsPDF();
    const cellMap = (cells || []).reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

    const days = ['Friday', 'Saturday', 'Sunday'];
    const dayLabels = { Friday: 'Sexta-feira', Saturday: 'Sábado', Sunday: 'Domingo' };

    let isFirstPage = true;

    days.forEach((day, dayIndex) => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Escala de Trabalho - ${dayLabels[day]}${getFilterTitle(filterType)}`, 14, 20);

        const periods = [
            { id: 'Breakfast', label: 'CAFÉ DA MANHÃ' },
            { id: 'Lunch', label: 'ALMOÇO' },
            { id: 'Afternoon', label: 'LANCHE DA TARDE' },
            { id: 'Dinner', label: 'JANTAR' }
        ];

        let currentY = 30;

        periods.forEach(p => {
            const dayPeriods = day === 'Friday' ? ['Dinner'] : day === 'Sunday' ? ['Breakfast', 'Lunch'] : ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'];

            if (!dayPeriods.includes(p.id)) return;

            // Add period title
            if (currentY > 260) { doc.addPage(); currentY = 20; }
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.text(p.label, 14, currentY + 5);
            currentY += 10;

            areas.forEach(area => {
                const areaAssignments = scales.filter(s => s.day === day && s.period === p.id && s.area_id === area.id);
                const tableBody = [];

                for (let i = 0; i < area.required_people; i++) {
                    const asg = areaAssignments[i];
                    const worker = workers.find(w => w.id === asg?.worker_id);
                    // Check if assigned but hidden (filtered out)
                    const isAssignedButHidden = asg?.worker_id && !worker;

                    const cellName = worker ? (cellMap[worker.cell_id] || 'SEM CÉLULA') : null;

                    if (isAssignedButHidden) {
                        tableBody.push(['-', '-']);
                    } else {
                        tableBody.push([
                            worker ? `${worker.name.toUpperCase()} ${worker.surname.toUpperCase()}` : '(VAZIO)',
                            worker ? cellName.toUpperCase() : '-'
                        ]);
                    }
                }

                // Add section title above table
                if (currentY > 255) { doc.addPage(); currentY = 20; }
                doc.setFontSize(15);
                doc.setFont('helvetica', 'bold');
                doc.text(area.name.toUpperCase(), 14, currentY);
                currentY += 5;

                autoTable(doc, {
                    ...commonTableStyles,
                    startY: currentY,
                    head: [['NOME COMPLETO', 'CÉLULA']],
                    body: tableBody,
                    headStyles: { ...commonTableStyles.headStyles, fillColor: [0, 0, 0], fontSize: 11 },
                    margin: { left: 14, right: 14 },
                });

                currentY = doc.lastAutoTable.finalY + 10;

                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
            });

            currentY += 10;
        });
    });

    doc.save(`Escala_Completa_${filterType || 'Geral'}.pdf`);
};

export const generateFixedScalePDF = (fixedScales, workers, cells, filterType) => {
    const doc = new jsPDF();
    const cellMap = (cells || []).reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Equipes Fixas${getFilterTitle(filterType)}`, 14, 20);

    fixedScales?.forEach((scale, index) => {
        let startY = index === 0 ? 35 : doc.lastAutoTable.finalY + 15;

        if (startY > 250) {
            doc.addPage();
            startY = 25;
            doc.text('Equipes Fixas (Continuação)', 14, 20);
        }

        const memberData = (scale.members || [])
            .map(id => {
                const w = workers.find(work => work.id === id);
                if (!w) return null; // Filter out if not found (wrong gender)
                const cellName = w ? (cellMap[w.cell_id] || 'SEM CÉLULA') : '';
                return [
                    `${w.name.toUpperCase()} ${w.surname.toUpperCase()}`,
                    cellName.toUpperCase()
                ];
            })
            .filter(Boolean); // Remove nulls

        // Add team title above table
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(scale.name.toUpperCase(), 14, startY);
        startY += 5;

        autoTable(doc, {
            ...commonTableStyles,
            startY: startY,
            head: [['NOME COMPLETO', 'CÉLULA']],
            body: memberData.length > 0 ? memberData : [['NENHUM MEMBRO (NESTE FILTRO)', '-']],
            headStyles: { ...commonTableStyles.headStyles, fillColor: [0, 0, 0], fontSize: 11 }
        });
    });

    doc.save(`Equipes_Fixas_${filterType || 'Geral'}.pdf`);
};

export const generatePrayerClockPDF = (assignments, slots, workers, cells, filterType) => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Relógio de Oração${getFilterTitle(filterType)}`, 14, 20);

    const cellMap = (cells || []).reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

    const body = slots.map(slot => {
        const asg = assignments.find(a => a.id === slot.id);
        const w1 = workers.find(w => w.id === asg?.worker_1_id);
        const w2 = workers.find(w => w.id === asg?.worker_2_id);

        const label1 = asg?.worker_1_id && !w1 ? '-' : (w1 ? `${w1.name} ${w1.surname}\n[${cellMap[w1.cell_id] || 'Sem Célula'}]` : '(Vazio)');
        const label2 = asg?.worker_2_id && !w2 ? '-' : (w2 ? `${w2.name} ${w2.surname}\n[${cellMap[w2.cell_id] || 'Sem Célula'}]` : '(Vazio)');

        return [
            `${slot.time} (${slot.day})`,
            label1,
            label2
        ];
    });

    autoTable(doc, {
        ...commonTableStyles,
        startY: 30,
        head: [['Horário', 'Guerreiro 1', 'Guerreiro 2']],
        body: body,
        styles: { ...commonTableStyles.styles, fontSize: 10 },
        headStyles: { ...commonTableStyles.headStyles, fontSize: 13 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 70 },
            2: { cellWidth: 70 }
        }
    });

    doc.save(`Relogio_de_Oracao_${filterType || 'Geral'}.pdf`);
};
