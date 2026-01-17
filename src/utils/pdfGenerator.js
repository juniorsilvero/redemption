import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Global styles for all tables to ensure bold/legible text
const commonTableStyles = {
    styles: {
        fontSize: 11, // Increased overall font size slightly
        fontStyle: 'bold',
        cellPadding: 3,
        textColor: [0, 0, 0]
    },
    headStyles: {
        fillColor: [0, 0, 0], // Black background as requested
        textColor: [255, 255, 255], // White text
        fontStyle: 'bold',
        fontSize: 13, // Increased header font size
        halign: 'center' // Center header text for better look
    },
    theme: 'grid'
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

export const generateScalePDF = (day, scales, areas, workers, cells) => {
    const doc = new jsPDF();
    const dayLabel = day === 'Friday' ? 'Sexta-feira' : day === 'Saturday' ? 'Sábado' : 'Domingo';
    const cellMap = (cells || []).reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Escala de Trabalho - ${dayLabel}`, 14, 20);

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
        doc.setTextColor(0, 0, 0); // Black for period titles too
        doc.text(p.label, 14, currentY + 5);
        currentY += 10;

        areas.forEach(area => {
            const areaAssignments = scales.filter(s => s.day === day && s.period === p.id && s.area_id === area.id);
            const tableBody = [];

            for (let i = 0; i < area.required_people; i++) {
                const asg = areaAssignments[i];
                const worker = workers.find(w => w.id === asg?.worker_id);
                const cellName = worker ? (cellMap[worker.cell_id] || 'Sem Célula') : null;

                tableBody.push([
                    worker ? `${worker.name} ${worker.surname} [${cellName}]` : '(Vazio)'
                ]);
            }

            autoTable(doc, {
                ...commonTableStyles,
                startY: currentY,
                head: [[area.name]],
                body: tableBody,
                headStyles: { ...commonTableStyles.headStyles, fillColor: [0, 0, 0], fontSize: 13 },
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

    doc.save(`Escala_${dayLabel}.pdf`);
};

export const generateFixedScalePDF = (fixedScales, workers) => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipes Fixas / Grupos de Trabalho', 14, 20);

    fixedScales?.forEach((scale, index) => {
        let startY = index === 0 ? 35 : doc.lastAutoTable.finalY + 15;

        if (startY > 250) {
            doc.addPage();
            startY = 25;
            doc.text('Equipes Fixas (Continuação)', 14, 20);
        }

        const memberData = (scale.members || []).map(id => {
            const w = workers.find(work => work.id === id);
            return [w ? `${w.name} ${w.surname}` : 'Desconhecido'];
        });

        autoTable(doc, {
            ...commonTableStyles,
            startY: startY,
            head: [[scale.name]],
            body: memberData.length > 0 ? memberData : [['Nenhum membro na equipe']],
            headStyles: { ...commonTableStyles.headStyles, fillColor: [0, 0, 0], fontSize: 13 }
        });
    });

    doc.save('Equipes_Fixas.pdf');
};

export const generatePrayerClockPDF = (assignments, slots, workers, cells) => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Relógio de Oração - 48 Horas', 14, 20);

    const cellMap = (cells || []).reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

    const body = slots.map(slot => {
        const asg = assignments.find(a => a.id === slot.id);
        const w1 = workers.find(w => w.id === asg?.worker_1_id);
        const w2 = workers.find(w => w.id === asg?.worker_2_id);

        return [
            `${slot.time} (${slot.day})`,
            w1 ? `${w1.name} ${w1.surname}\n[${cellMap[w1.cell_id] || 'Sem Célula'}]` : '(Vazio)',
            w2 ? `${w2.name} ${w2.surname}\n[${cellMap[w2.cell_id] || 'Sem Célula'}]` : '(Vazio)'
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

    doc.save('Relogio_de_Oracao.pdf');
};
