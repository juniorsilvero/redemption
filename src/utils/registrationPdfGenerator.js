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
    doc.setTextColor(200, 0, 0); // Red
    doc.setFontSize(10);
    doc.text('Valor da', 140, currentY - 2);
    doc.text('inscrição:', 140, currentY + 2);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(`R$ ${price}`, 175, currentY + 2);
    
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

    // Helper to draw a box with text
    const drawBox = (x, y, w, h, label, value = '') => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, w, h, 1, 1, 'S');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(label, x + 2, y + 5);
        if (value) {
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), x + 2 + doc.getTextWidth(label) + 2, y + 5);
        }
    };

    // FORM FIELDS
    // ROW 1
    drawBox(margin, currentY, 182, 8, 'Nome Completo:', `${data.name} ${data.surname}`);
    currentY += 10;

    // ROW 2
    let birthStr = '';
    if (data.birth_date) {
        birthStr = format(new Date(data.birth_date + 'T12:00:00'), 'dd/MM/yyyy');
    }
    drawBox(margin, currentY, 70, 8, 'Data de Nascimento:', birthStr);
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
    drawBox(margin, currentY, 100, 8, 'Telefone de um familiar:', data.family_contact_1 || '');
    drawBox(margin + 102, currentY, 80, 8, 'Grau Parentesco:', data.family_relationship_1 || '');
    currentY += 10;
    drawBox(margin, currentY, 100, 8, 'Telefone de um familiar:', data.family_contact_2 || '');
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

    drawBox(margin, currentY, 182, 8, 'Restrição alimentar ou alergias?', data.food_restrictions || '');
    currentY += 10;
    drawBox(margin, currentY, 182, 8, 'Toma algum medicamento controlado?', data.controlled_medication || '');
    currentY += 10;
    drawBox(margin, currentY, 182, 8, 'Restrição ou Deficiência Física ou Auditiva?', data.physical_restrictions || '');
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
