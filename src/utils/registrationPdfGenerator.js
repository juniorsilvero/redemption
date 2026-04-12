import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const generateRegistrationPDF = (data, churchName = 'IGREJA INTERNACIONAL GERAÇÃO PROFÉTICA', price = '290.00') => {
    const doc = new jsPDF();
    const margin = 14;
    let currentY = 20;

    // Header styling
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(churchName.toUpperCase(), margin, currentY);
    
    currentY += 8;
    // Black banner for "Ficha de Inscrição"
    doc.setFillColor(30, 30, 30);
    doc.roundedRect(margin, currentY - 6, 110, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Ficha de Inscrição', margin + 5, currentY + 2);
    
    // Right side text (Price)
    const formattedPrice = Number(price) % 1 === 0 ? Number(price).toFixed(0) : Number(price).toFixed(2);
    doc.setTextColor(200, 0, 0); // Red
    doc.setFontSize(10);
    doc.text('Valor da', 140, currentY - 2);
    doc.text('inscrição:', 140, currentY + 2);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(`R$ ${formattedPrice}`, 175, currentY + 2);
    
    doc.setFontSize(8);
    doc.text('Incluso Transporte,', 140, currentY + 7);
    doc.text('Estadia e Alimentação', 140, currentY + 11);

    // Vertical line
    doc.setLineWidth(0.5);
    doc.line(135, currentY - 8, 135, currentY + 14);

    currentY += 10;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ENCONTRO REDENÇÃO CAMBORIU', margin, currentY + 2);
    
    currentY += 6;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('PASTORES RESPONSÁVEIS:', margin, currentY);
    doc.text('(PR. COUTINHO 22 99943-6176), E (PRA. GABRIELY 22 99768-0320)', margin, currentY + 4);

    currentY += 12;

    // Helper to draw a box with text and improved spacing
    const drawBox = (x, y, w, h, label, value = '', isRed = false) => {
        const displayValue = value || 'Não';
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, w, h, 1, 1, 'S');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        if (isRed) doc.setTextColor(200, 0, 0);
        else doc.setTextColor(0);
        
        doc.text(label, x + 2, y + 5);
        
        const labelWidth = doc.getTextWidth(label);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        // Added more space (+4) between label and value to avoid overlapping
        doc.text(String(displayValue), x + 2 + labelWidth + 4, y + 5);
    };

    // Helper to draw color dot
    const drawColorDot = (x, y, color) => {
        try {
            const hex = color || '#000000';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            doc.setFillColor(r, g, b);
            doc.circle(x, y, 1.5, 'F');
        } catch (e) {
            doc.setFillColor(0, 0, 0);
            doc.circle(x, y, 1.5, 'F');
        }
    };

    // FORM FIELDS
    // ROW 1: Name, Responsible, and Cell Info
    doc.setDrawColor(0);
    doc.roundedRect(margin, currentY, 182, 8, 1, 1, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', margin + 2, currentY + 5);
    const nameWidth = doc.getTextWidth('Nome:');
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.name} ${data.surname}`, margin + 2 + nameWidth + 2, currentY + 5);
    
    // Add Responsible and Cell on the same row if space allows or simplified
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let infoX = margin + 110;
    
    // Cell Info with Dot
    if (data.cell_name) {
        drawColorDot(infoX, currentY + 4, data.cell_color);
        doc.setTextColor(0);
        doc.text(data.cell_name, infoX + 4, currentY + 5);
        infoX += doc.getTextWidth(data.cell_name) + 12;
    }
    
    // Responsible Worker
    if (data.responsible_worker_name) {
        doc.text('Resp:', infoX, currentY + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(data.responsible_worker_name, infoX + 8, currentY + 5);
    }
    doc.setTextColor(0);
    currentY += 10;

    // ROW 2
    let birthStr = '';
    if (data.birth_date) {
        birthStr = format(new Date(data.birth_date + 'T12:00:00'), 'dd/MM/yyyy');
    }
    drawBox(margin, currentY, 70, 8, 'Nascimento:', birthStr);
    drawBox(margin + 72, currentY, 40, 8, 'Idade:', data.age || '');
    drawBox(margin + 114, currentY, 68, 8, 'Celular:', data.phone || '');
    currentY += 12;

    // ROW 3
    const fullAddress = `${data.address || ''}${data.neighborhood ? ', ' + data.neighborhood : ''}${data.city ? ', ' + data.city : ''}${data.state ? ' - ' + data.state : ''}`;
    drawBox(margin, currentY, 182, 8, 'Endereço:', fullAddress);
    currentY += 10;

    // Preenchimento Obrigatório
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(7);
    doc.text('Preenchimento Obrigatório', margin, currentY);
    currentY += 2;
    doc.setTextColor(0, 0, 0);

    // ROW 5 & 6
    drawBox(margin, currentY, 100, 8, 'Telefone familiar 1:', data.family_contact_1 || '');
    drawBox(margin + 102, currentY, 80, 8, 'Grau Parentesco:', data.family_relationship_1 || '');
    currentY += 10;
    drawBox(margin, currentY, 100, 8, 'Telefone familiar 2:', data.family_contact_2 || '');
    drawBox(margin + 102, currentY, 80, 8, 'Grau Parentesco:', data.family_relationship_2 || '');
    currentY += 14;

    // INFORMAÇÕES IMPORTANTES
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, currentY, 182, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES IMPORTANTES:', 105, currentY + 4.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;

    drawBox(margin, currentY, 182, 8, 'Restrição alimentar ou alergias?', data.food_restrictions || 'Não');
    currentY += 10;
    drawBox(margin, currentY, 182, 8, 'Toma algum medicamento controlado?', data.controlled_medication || 'Não');
    currentY += 10;
    drawBox(margin, currentY, 182, 8, 'Restrição ou Deficiência física?', data.physical_restrictions || 'Não');
    currentY += 14;

    // INFORMAÇÕES GERAIS
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, currentY, 182, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('INFORMAÇÕES GERAIS:', 105, currentY + 4.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text('• NÃO DEVOLVEMOS O DINHEIRO DA INSCRIÇÃO, EM HIPÓTESE ALGUMA.', margin, currentY);
    currentY += 6;
    doc.setTextColor(0, 0, 0);
    doc.text('• É NECESSÁRIO A AUTORIZAÇÃO DOS RESPONSÁVEIS PARA OS MENORES DE 18 ANOS.', margin, currentY);
    currentY += 6;
    doc.text('• NÃO É PERMITIDO A IDA DE: CRIANÇAS (0 A 11 ANOS), GRÁVIDAS EM QUALQUER TEMPO DE GESTAÇÃO, PESSOAS IDOSAS', margin, currentY);
    currentY += 6;
    doc.text('  A PARTIR DE 60 ANOS, E PESSOAS COM DOENÇAS CRÔNICAS, E QUE NECESSITEM DE CUIDADOS ESPECIAIS.', margin, currentY);
    currentY += 10;

    // PAGAMENTOS E CONDIÇÕES
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, currentY, 182, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('PAGAMENTOS E CONDIÇÕES', 105, currentY + 4.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;

    doc.setDrawColor(0);
    doc.roundedRect(margin, currentY, 182, 8, 1, 1, 'S');
    doc.text('NO DIA SÓ ACEITAMOS PAGAMENTOS EM DINHEIRO', 105, currentY + 5.5, { align: 'center' });
    currentY += 10;

    doc.roundedRect(margin, currentY, 182, 8, 1, 1, 'S');
    doc.text('PAGAMENTO COM CARTÃO ATÉ 1 DIA ANTES', 105, currentY + 5.5, { align: 'center' });
    currentY += 14;

    // TERMO PARA MENOR DE 18 ANOS
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, currentY, 182, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('TERMO PARA MENOR DE 18 ANOS', 105, currentY + 4.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 10;

    doc.setFontSize(9);
    doc.text('AUTORIZAÇÃO DO RESPONSÁVEL LEGAL (MENORES DE 18 ANOS)', 105, currentY, { align: 'center' });
    currentY += 8;
    
    doc.text('NESTA DATA ____/____/______ LI E CONCORDEI COM A PARTICIPAÇÃO DO MENOR ACIMA', 105, currentY, { align: 'center' });
    currentY += 8;
    doc.text('DESCRITO NO ENCONTRO REDENÇÃO, EVENTO REALIZADO PELA ' + churchName.toUpperCase() + '.', 105, currentY, { align: 'center' });
    currentY += 14;
    
    doc.text('ASSINATURA DO RESPONSÁVEL: ____________________________________________________________________', margin + 10, currentY);

    doc.save(`Ficha_Inscricao_${data.name}.pdf`);
};
