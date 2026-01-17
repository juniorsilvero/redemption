import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateRoomPDF = (room, leaders, occupants, cellMap) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Acomodação: ${room.name}`, 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gênero: ${room.gender === 'male' ? 'Masculino' : 'Feminino'} | Capacidade: ${occupants.length} / ${room.capacity}`, 14, 28);

    // Leaders Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Líderes do Quarto', 14, 40);

    const leaderData = leaders.map(l => [
        `${l.name} ${l.surname}`,
        l.phone || 'Sem telefone',
        cellMap[l.cell_id]?.name || 'Sem célula'
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Nome', 'Telefone', 'Célula']],
        body: leaderData.length > 0 ? leaderData : [['Nenhum líder atribuído', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] } // indigo-600
    });

    // Passers Table
    const finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Passantes / Ocupantes', 14, finalY + 15);

    const occupantData = occupants.map(p => [
        `${p.name} ${p.surname}`,
        cellMap[p.cell_id]?.name || 'Sem célula'
    ]);

    doc.autoTable({
        startY: finalY + 20,
        head: [['Nome Completo', 'Célula']],
        body: occupantData.length > 0 ? occupantData : [['Nenhum passante alocado', '-']],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Quarto_${room.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateScalePDF = (day, scales, areas, workers) => {
    const doc = new jsPDF();
    const dayLabel = day === 'Friday' ? 'Sexta-feira' : day === 'Saturday' ? 'Sábado' : 'Domingo';

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Escala de Trabalho - ${dayLabel}`, 14, 20);

    const periods = [
        { id: 'Breakfast', label: 'Café da Manhã' },
        { id: 'Lunch', label: 'Almoço' },
        { id: 'Afternoon', label: 'Lanche da Tarde' },
        { id: 'Dinner', label: 'Jantar' }
    ];

    let currentY = 30;

    periods.forEach(p => {
        // Only show periods that have assignments or are valid for the day (Friday only Dinner, Sunday only Breakfast/Lunch)
        const dayPeriods = day === 'Friday' ? ['Dinner'] : day === 'Sunday' ? ['Breakfast', 'Lunch'] : ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'];

        if (!dayPeriods.includes(p.id)) return;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(p.label, 14, currentY);

        const tableBody = [];
        areas.forEach(area => {
            const areaAssignments = scales.filter(s => s.day === day && s.period === p.id && s.area_id === area.id);
            const slotCount = area.required_people;

            for (let i = 0; i < slotCount; i++) {
                const asg = areaAssignments[i];
                const worker = workers.find(w => w.id === asg?.worker_id);
                tableBody.push([
                    area.name,
                    worker ? `${worker.name} ${worker.surname}` : '(Vazio)'
                ]);
            }
        });

        doc.autoTable({
            startY: currentY + 5,
            head: [['Área de Serviço', 'Trabalhador Responsável']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }, // slate-800
            margin: { bottom: 20 }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        // Add new page if close to bottom
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
    });

    doc.save(`Escala_${dayLabel}.pdf`);
};

export const generateFixedScalePDF = (fixedScales, workers) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipes Fixas / Grupos de Trabalho', 14, 20);

    fixedScales.forEach((scale, index) => {
        const startY = index === 0 ? 35 : doc.lastAutoTable.finalY + 15;

        if (startY > 250) {
            doc.addPage();
            doc.text('Equipes Fixas (Continuação)', 14, 20);
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(scale.name, 14, index === 0 ? 30 : startY - 5);

        const memberData = (scale.members || []).map(id => {
            const w = workers.find(work => work.id === id);
            return [w ? `${w.name} ${w.surname}` : 'Desconhecido'];
        });

        doc.autoTable({
            startY: index === 0 ? 35 : startY,
            head: [['Nome do Membro']],
            body: memberData.length > 0 ? memberData : [['Nenhum membro na equipe']],
            theme: 'striped',
            headStyles: { fillColor: [71, 85, 105] } // slate-600
        });
    });

    doc.save('Equipes_Fixas.pdf');
};

export const generatePrayerClockPDF = (assignments, slots, workers, cells) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relógio de Oração - 48 Horas Ininterruptas', 14, 20);

    const body = slots.map(slot => {
        const asg = assignments.find(a => a.id === slot.id);
        const w1 = workers.find(w => w.id === asg?.worker_1_id);
        const w2 = workers.find(w => w.id === asg?.worker_2_id);

        const cell1 = cells.find(c => c.id === w1?.cell_id);
        const cell2 = cells.find(c => c.id === w2?.cell_id);

        return [
            `${slot.time} (${slot.day})`,
            w1 ? `${w1.name} ${w1.surname}\n[${cell1?.name || 'Sem Célula'}]` : '(Vazio)',
            w2 ? `${w2.name} ${w2.surname}\n[${cell2?.name || 'Sem Célula'}]` : '(Vazio)'
        ];
    });

    doc.autoTable({
        startY: 30,
        head: [['Horário', 'Guerreiro 1', 'Guerreiro 2']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { cellPadding: 3, fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 70 },
            2: { cellWidth: 70 }
        }
    });

    doc.save('Relogio_de_Oracao.pdf');
};
