import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportMeta {
    entityName: string;
    dateFrom: string;
    dateTo: string;
    generatedBy: string;
}

const TYPE_LABELS: Record<string, string> = {
    VISITOR: 'Visitante',
    INCIDENT: 'Incidente',
    ROUND: 'Ronda',
    DELIVERY: 'Entrega',
    SERVICE: 'Servicio',
    PROVEEDOR: 'Proveedor',
    INFO: 'Informativo',
    FACTURA: 'Factura',
    ENCOMIENDA: 'Encomienda',
};

function formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function extractDetails(log: any): string {
    const d = log.details || {};
    const parts: string[] = [];
    if (d.plate) parts.push(`Placa: ${d.plate}`);
    if (d.destination) parts.push(`Destino: ${d.destination}`);
    if (d.resident) parts.push(`Residente: ${d.resident}`);
    if (d.residente) parts.push(`Residente: ${d.residente}`);
    if (d.company) parts.push(`Empresa: ${d.company}`);
    if (d.visitor_name) parts.push(`Visitante: ${d.visitor_name}`);
    if (d.package_type) parts.push(`Tipo: ${d.package_type}`);
    if (d.invoice_number) parts.push(`Factura: ${d.invoice_number}`);
    if (d.area) parts.push(`Área: ${d.area}`);
    return parts.length > 0 ? parts.join(' | ') : (log.description || '-');
}

function addReportHeader(doc: jsPDF, meta: ReportMeta, title: string) {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 42, 'F');

    // App name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BITÁCORA 2.0', 15, 16);

    // Title on right
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(title, pageWidth - 15, 16, { align: 'right' });

    // Entity and period
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(meta.entityName, 15, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Período: ${meta.dateFrom} — ${meta.dateTo}`, 15, 36);
    doc.text(`Generado por: ${meta.generatedBy}  |  Fecha: ${formatDate(new Date().toISOString())}`, pageWidth - 15, 36, { align: 'right' });

    doc.setTextColor(0, 0, 0);
}

export function generateMinutaPDF(logs: any[], meta: ReportMeta) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    addReportHeader(doc, meta, 'MINUTA DE EVENTOS');

    const sorted = [...logs].sort((a, b) =>
        new Date(a.occurred_at || a.created_at).getTime() - new Date(b.occurred_at || b.created_at).getTime()
    );

    const rows = sorted.map(log => [
        formatTime(log.occurred_at || log.created_at),
        TYPE_LABELS[log.type] || log.type,
        log.title || '-',
        extractDetails(log),
        log.status || '-',
        log.critical_level || 'BAJA',
        log.profiles?.full_name || log.entities?.name || '-',
    ]);

    autoTable(doc, {
        startY: 50,
        head: [['Hora', 'Tipo', 'Evento', 'Detalles', 'Estado', 'Nivel', 'Guardia/Entidad']],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 22 },
            2: { cellWidth: 50 },
            3: { cellWidth: 80 },
            4: { cellWidth: 20 },
            5: { cellWidth: 18 },
            6: { cellWidth: 35 },
        },
        didDrawPage: (data) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`Total de eventos: ${sorted.length}`, 15, pageHeight - 10);
            doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0);
        },
    });

    // Signature field
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    if (finalY < doc.internal.pageSize.getHeight() - 30) {
        doc.setDrawColor(200);
        doc.line(15, finalY, 95, finalY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('Firma Coordinador / Administrador', 15, finalY + 6);
        doc.text(`Total de eventos registrados: ${sorted.length}`, pageWidth - 15, finalY + 6, { align: 'right' });
    }

    doc.save(`minuta_${meta.dateFrom}_${meta.dateTo}.pdf`);
}

export function generateResumenPDF(logs: any[], shifts: any[], meta: ReportMeta) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    addReportHeader(doc, meta, 'RESUMEN EJECUTIVO');

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 52;

    // ─── Métricas resumidas ───────────────────────────────────────
    const counts = {
        visitors: logs.filter(l => l.type === 'VISITOR').length,
        rounds: logs.filter(l => l.type === 'ROUND').length,
        incidents: logs.filter(l => l.type === 'INCIDENT').length,
        deliveries: logs.filter(l => l.type === 'DELIVERY' || l.type === 'ENCOMIENDA').length,
        facturas: logs.filter(l => l.type === 'FACTURA').length,
    };

    const cards = [
        { label: 'Visitantes', value: counts.visitors, color: [59, 130, 246] as [number, number, number] },
        { label: 'Rondas', value: counts.rounds, color: [16, 185, 129] as [number, number, number] },
        { label: 'Incidentes', value: counts.incidents, color: [239, 68, 68] as [number, number, number] },
        { label: 'Encomiendas', value: counts.deliveries, color: [245, 158, 11] as [number, number, number] },
        { label: 'Facturas', value: counts.facturas, color: [139, 92, 246] as [number, number, number] },
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50);
    doc.text('RESUMEN DE ACTIVIDAD', 15, y);
    y += 8;

    const cardW = (pageWidth - 30) / cards.length;
    cards.forEach((card, i) => {
        const x = 15 + i * cardW;
        doc.setFillColor(...card.color);
        doc.roundedRect(x, y, cardW - 4, 24, 3, 3, 'F');
        doc.setTextColor(255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(card.value), x + (cardW - 4) / 2, y + 13, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(card.label, x + (cardW - 4) / 2, y + 20, { align: 'center' });
    });
    y += 32;

    // ─── Tabla por guardia ────────────────────────────────────────
    doc.setTextColor(50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ACTIVIDAD POR GUARDIA', 15, y);
    y += 4;

    const guardMap: Record<string, { name: string; rounds: number; visitors: number; incidents: number; shiftsCount: number }> = {};
    logs.forEach(log => {
        const guardId = log.profiles?.id || 'unknown';
        const guardName = log.profiles?.full_name || 'Desconocido';
        if (!guardMap[guardId]) guardMap[guardId] = { name: guardName, rounds: 0, visitors: 0, incidents: 0, shiftsCount: 0 };
        if (log.type === 'ROUND') guardMap[guardId].rounds++;
        if (log.type === 'VISITOR' || log.type === 'DELIVERY') guardMap[guardId].visitors++;
        if (log.type === 'INCIDENT') guardMap[guardId].incidents++;
    });

    shifts.forEach(shift => {
        const gId = shift.user_id;
        if (guardMap[gId]) guardMap[gId].shiftsCount++;
    });

    autoTable(doc, {
        startY: y,
        head: [['Guardia', 'Turnos', 'Rondas', 'Visitantes/Entregas', 'Incidentes']],
        body: Object.values(guardMap).map(g => [g.name, g.shiftsCount, g.rounds, g.visitors, g.incidents]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ─── Eventos críticos ─────────────────────────────────────────
    const criticals = logs.filter(l => l.critical_level === 'ALTA' || l.type === 'INCIDENT');
    if (criticals.length > 0) {
        doc.setTextColor(50);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('EVENTOS CRÍTICOS (NIVEL ALTO)', 15, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Hora', 'Tipo', 'Evento', 'Entidad', 'Estado']],
            body: criticals.map(l => [
                formatTime(l.occurred_at || l.created_at),
                TYPE_LABELS[l.type] || l.type,
                l.title || '-',
                l.entities?.name || '-',
                l.status || '-',
            ]),
            styles: { fontSize: 8.5, cellPadding: 3 },
            headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [254, 242, 242] },
        });
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Bitácora 2.0 — ${meta.entityName}`, 15, ph - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, ph - 10, { align: 'right' });
    }

    doc.save(`resumen_${meta.dateFrom}_${meta.dateTo}.pdf`);
}
