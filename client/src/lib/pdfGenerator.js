import { jsPDF } from 'jspdf';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FOOTER_ZONE = 30; // Reserved space at bottom

function getSymbol(currency) {
  return currency + ' ';
}

function fmtMoney(amount, currency) {
  return `${getSymbol(currency)}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Check if we need a new page and add one if so.
 * Returns the updated Y position.
 */
function checkPageOverflow(doc, y, neededSpace = 20) {
  if (y + neededSpace > PAGE_HEIGHT - FOOTER_ZONE) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/**
 * Generate and download a professional PDF invoice.
 */
export function downloadInvoicePDF(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const sym = getSymbol(invoice.currency || 'INR');
  const currency = invoice.currency || 'INR';
  let y = MARGIN;

  // ─── Status Badge (top-right) ──────────────────────────
  const statusColors = {
    pending: [245, 158, 11],
    reminder_sent: [59, 130, 246],
    overdue: [239, 68, 68],
    paid: [16, 185, 129],
  };
  const statusLabels = {
    pending: 'PENDING',
    reminder_sent: 'REMINDER SENT',
    overdue: 'OVERDUE',
    paid: 'PAID',
  };
  const sc = statusColors[invoice.status] || statusColors.pending;
  const statusLabel = statusLabels[invoice.status] || invoice.status?.toUpperCase() || 'PENDING';

  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.roundedRect(PAGE_WIDTH - MARGIN - 36, y, 36, 8, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, PAGE_WIDTH - MARGIN - 18, y + 5.5, { align: 'center' });

  // ─── Business Name ─────────────────────────────────────
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.business_name || 'Your Business', MARGIN, y + 7);
  y += 16;

  // ─── "INVOICE" Title ───────────────────────────────────
  doc.setFontSize(28);
  doc.setTextColor(45, 212, 191);
  doc.text('INVOICE', MARGIN, y + 8);
  y += 14;

  // ─── Invoice Meta (number + dates) ─────────────────────
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');

  const metaLines = [
    `Invoice #: ${invoice.invoice_number || invoice.id}`,
    `Issue Date: ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A'}`,
    `Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`,
    `Currency: ${currency}`,
  ];

  metaLines.forEach((line) => {
    doc.text(line, MARGIN, y);
    y += 5;
  });
  y += 4;

  // ─── Bill To Block ─────────────────────────────────────
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 3, 3, 'F');

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO', MARGIN + 5, y + 5);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.client_name || '', MARGIN + 5, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let billY = y + 16;
  if (invoice.client_email) { doc.text(invoice.client_email, MARGIN + 5, billY); billY += 4; }
  if (invoice.client_phone) { doc.text(invoice.client_phone, MARGIN + 5, billY); billY += 4; }
  if (invoice.client_address) {
    const addrLines = doc.splitTextToSize(invoice.client_address, CONTENT_WIDTH - 10);
    doc.text(addrLines, MARGIN + 5, billY);
  }
  y += 34;

  // ─── Line Items Table ──────────────────────────────────
  y = checkPageOverflow(doc, y, 20);

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');

  const colX = {
    desc: MARGIN + 4,
    qty: MARGIN + CONTENT_WIDTH * 0.55,
    price: MARGIN + CONTENT_WIDTH * 0.7,
    total: MARGIN + CONTENT_WIDTH * 0.88,
  };

  doc.text('DESCRIPTION', colX.desc, y + 5.5);
  doc.text('QTY', colX.qty, y + 5.5);
  doc.text('UNIT PRICE', colX.price, y + 5.5);
  doc.text('TOTAL', colX.total, y + 5.5);
  y += 10;

  // Table rows
  doc.setFont('helvetica', 'normal');
  const items = invoice.line_items || [];

  items.forEach((item, index) => {
    y = checkPageOverflow(doc, y, 10);

    // Zebra striping
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y - 1, CONTENT_WIDTH, 8, 'F');
    }

    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    // Truncate long descriptions
    const descText = doc.splitTextToSize(item.description || '', CONTENT_WIDTH * 0.5);
    doc.text(descText[0] || '', colX.desc, y + 4);

    doc.text(String(item.quantity || 1), colX.qty, y + 4);
    doc.text(fmtMoney(item.unit_price || 0, currency), colX.price, y + 4);
    doc.text(fmtMoney(item.line_total || 0, currency), colX.total, y + 4);
    y += 8;
  });

  if (items.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No line items', MARGIN + 4, y + 4);
    y += 8;
  }

  // ─── Totals Section ────────────────────────────────────
  y += 4;
  y = checkPageOverflow(doc, y, 40);

  const totalsX = MARGIN + CONTENT_WIDTH * 0.6;
  const totalsValueX = MARGIN + CONTENT_WIDTH - 4;

  doc.setDrawColor(226, 232, 240);
  doc.line(totalsX, y, totalsValueX + 4, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');

  // Subtotal
  doc.text('Subtotal', totalsX, y);
  doc.text(fmtMoney(invoice.subtotal || 0, currency), totalsValueX, y, { align: 'right' });
  y += 6;

  // Tax
  doc.text(`Tax (${invoice.tax_percent || 0}%)`, totalsX, y);
  const taxAmount = (invoice.subtotal || 0) * ((invoice.tax_percent || 0) / 100);
  doc.text(fmtMoney(taxAmount, currency), totalsValueX, y, { align: 'right' });
  y += 6;

  // Discount
  if (invoice.discount && invoice.discount > 0) {
    const discLabel = invoice.discount_type === 'percent'
      ? `Discount (${invoice.discount}%)`
      : 'Discount';
    doc.setTextColor(239, 68, 68);
    doc.text(discLabel, totalsX, y);
    const discAmount = invoice.discount_type === 'percent'
      ? (invoice.subtotal || 0) * (invoice.discount / 100)
      : invoice.discount;
    doc.text(`-${fmtMoney(discAmount, currency)}`, totalsValueX, y, { align: 'right' });
    doc.setTextColor(71, 85, 105);
    y += 6;
  }

  // Grand Total
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsX, y - 2, totalsValueX + 4, y - 2);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Grand Total', totalsX, y + 4);
  doc.setTextColor(45, 212, 191);
  doc.text(fmtMoney(invoice.grand_total || 0, currency), totalsValueX, y + 4, { align: 'right' });
  y += 14;

  // ─── Payment Info ──────────────────────────────────────
  y = checkPageOverflow(doc, y, 20);

  if (invoice.payment_terms || invoice.payment_method) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');

    let px = MARGIN + 5;
    if (invoice.payment_terms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Terms: ', px, y + 6);
      const tw = doc.getTextWidth('Payment Terms: ');
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.payment_terms, px + tw, y + 6);
    }

    if (invoice.payment_method) {
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method: ', px, y + 11);
      const tw2 = doc.getTextWidth('Payment Method: ');
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.payment_method, px + tw2, y + 11);
    }
    y += 20;
  }

  // ─── Notes ─────────────────────────────────────────────
  if (invoice.notes) {
    y = checkPageOverflow(doc, y, 20);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', MARGIN, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(invoice.notes, CONTENT_WIDTH);
    noteLines.forEach((line) => {
      y = checkPageOverflow(doc, y, 6);
      doc.text(line, MARGIN, y);
      y += 4.5;
    });
  }

  // ─── Download ──────────────────────────────────────────
  const filename = `Invoice-${invoice.invoice_number || invoice.id}.pdf`;
  doc.save(filename);
}
